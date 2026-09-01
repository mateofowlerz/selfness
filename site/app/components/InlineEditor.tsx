"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { patchWriting } from "../[slug]/actions";

// an existing markdown run in the source, e.g. "**AI safety**"
type Run = { start: number; end: number; source: string; inner: string };

type Selected = {
  start: number;
  end: number;
  text: string;
  bold: Run | null;
  italic: Run | null;
  link: Run | null;
  plain: boolean;
};

type Anchor = { top: number; left: number };

// wrapping a selection that already contains markup would produce broken markdown
const MARKUP = /[*_`[\]]/;

function countOccurrences(haystack: string, needle: string): number {
  let count = 0;
  let index = haystack.indexOf(needle);

  while (index !== -1) {
    count += 1;
    index = haystack.indexOf(needle, index + needle.length);
  }

  return count;
}

function nthIndexOf(haystack: string, needle: string, nth: number): number {
  let index = haystack.indexOf(needle);

  for (let seen = 0; seen < nth && index !== -1; seen += 1) {
    index = haystack.indexOf(needle, index + needle.length);
  }

  return index;
}

function markdownFor(element: Element): string {
  const inner = element.textContent ?? "";

  if (element.tagName === "STRONG") {
    return `**${inner}**`;
  }

  if (element.tagName === "EM") {
    return `*${inner}*`;
  }

  return `[${inner}](${element.getAttribute("href") ?? ""})`;
}

// finds where the element the selection sits in lives in the markdown source
function findRun(block: Element, blockStart: number, blockSource: string, element: Element | null): Run | null {
  if (!element) {
    return null;
  }

  const source = markdownFor(element);
  const twins = Array.from(block.querySelectorAll(element.tagName)).filter((twin) => markdownFor(twin) === source);
  const index = nthIndexOf(blockSource, source, Math.max(twins.indexOf(element), 0));

  if (index === -1) {
    return null;
  }

  return {
    start: blockStart + index,
    end: blockStart + index + source.length,
    source,
    inner: element.textContent ?? "",
  };
}

function ancestor(range: Range, selector: string): Element | null {
  const node = range.startContainer;
  const element = node instanceof Element ? node : node.parentElement;

  return element?.closest(selector) ?? null;
}

function resolve(source: string): { selected: Selected; anchor: Anchor } | null {
  const selection = window.getSelection();

  if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const raw = selection.toString();
  const text = raw.trim();

  if (!text) {
    return null;
  }

  const container = range.commonAncestorContainer;
  const block = (container instanceof Element ? container : container.parentElement)?.closest("[data-src]");

  if (!block) {
    return null;
  }

  const [blockStart, blockEnd] = (block.getAttribute("data-src") ?? "").split(":").map(Number);

  if (Number.isNaN(blockStart) || Number.isNaN(blockEnd)) {
    return null;
  }

  const blockSource = source.slice(blockStart, blockEnd);

  const bold = findRun(block, blockStart, blockSource, ancestor(range, "strong"));
  const italic = findRun(block, blockStart, blockSource, ancestor(range, "em"));
  const link = findRun(block, blockStart, blockSource, ancestor(range, "a"));

  const preceding = range.cloneRange();
  preceding.selectNodeContents(block);
  preceding.setEnd(range.startContainer, range.startOffset);

  // a selection that doesn't map cleanly onto the source can still remove a run it sits inside,
  // and otherwise leaves every toggle inert rather than writing broken markdown
  const index = nthIndexOf(blockSource, text, countOccurrences(preceding.toString(), text));
  const start = index === -1 ? -1 : blockStart + index;
  const end = index === -1 ? -1 : start + text.length;
  const rect = range.getBoundingClientRect();

  return {
    selected: {
      start,
      end,
      text,
      bold,
      italic,
      link,
      plain: index !== -1 && !MARKUP.test(source.slice(start, end)),
    },
    anchor: { top: rect.top, left: rect.left + rect.width / 2 },
  };
}

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA"].includes(target.tagName));
}

export default function InlineEditor({ slug, source }: { slug: string; source: string }) {
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    setEditing(sessionStorage.getItem("editing") === "on");
  }, []);

  useEffect(() => {
    function handleSelectionChange() {
      const resolved = resolve(source);

      setSelected(resolved?.selected ?? null);
      setAnchor(resolved?.anchor ?? null);
      setError(null);
    }

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, [source]);

  async function patch(start: number, end: number, expected: string, replacement: string) {
    const result = await patchWriting({ slug, start, end, expected, replacement });

    if (result.error) {
      setError(result.error);
      return;
    }

    window.getSelection()?.removeAllRanges();
    setSelected(null);
    setAnchor(null);
    startTransition(() => router.refresh());
  }

  // removing an existing run always drops the whole run, even on a partial selection
  function toggle(run: Run | null, wrap: (text: string) => string) {
    if (!selected || isPending) {
      return;
    }

    if (run) {
      patch(run.start, run.end, run.source, run.inner);
      return;
    }

    if (!selected.plain) {
      setError("Selection spans markup");
      return;
    }

    patch(selected.start, selected.end, selected.text, wrap(selected.text));
  }

  function toggleLink() {
    if (!selected || isPending) {
      return;
    }

    if (selected.link) {
      patch(selected.link.start, selected.link.end, selected.link.source, selected.link.inner);
      return;
    }

    if (!selected.plain) {
      setError("Selection spans markup");
      return;
    }

    const url = window.prompt("Link to");

    if (url) {
      patch(selected.start, selected.end, selected.text, `[${selected.text}](${url})`);
    }
  }

  function setMode(next: boolean) {
    sessionStorage.setItem("editing", next ? "on" : "off");
    setEditing(next);
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) {
        return;
      }

      if (!editing) {
        if (event.key.toLowerCase() === "e") {
          event.preventDefault();
          setMode(true);
        }

        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();

        if (selected) {
          window.getSelection()?.removeAllRanges();
          return;
        }

        setMode(false);
        return;
      }

      if (!selected) {
        return;
      }

      const operators: Record<string, () => void> = {
        b: () => toggle(selected.bold, (text) => `**${text}**`),
        i: () => toggle(selected.italic, (text) => `*${text}*`),
        k: toggleLink,
      };

      const operator = operators[event.key];

      if (operator) {
        event.preventDefault();
        operator();
      }
    }

    // capture phase so nothing on the page can swallow the shortcut first
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  });

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setMode(true)}
        className="fixed bottom-4 right-4 z-50 font-mono text-xs tracking-wide text-(--muted) opacity-40 transition-opacity duration-150 ease-out md:hover:opacity-100"
      >
        e to edit
      </button>
    );
  }

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50 font-mono text-xs tracking-wide text-(--muted)">
        {isPending ? "-- SAVING --" : "-- EDIT --"}
        <span className="ml-3 opacity-60">b bold · i italic · k link · esc</span>
      </div>

      {selected && anchor ? (
        <div
          role="toolbar"
          // keeps the selection alive while clicking a button
          onMouseDown={(event) => event.preventDefault()}
          style={{ top: anchor.top - 46, left: anchor.left }}
          className={`fixed z-50 flex -translate-x-1/2 items-center gap-0.5 rounded-lg border border-black/10 bg-white p-1 text-sm shadow-lg ${
            isPending ? "opacity-50" : ""
          }`}
        >
          {error ? (
            <span className="px-2 py-1 text-primary">{error}</span>
          ) : (
            <>
              <Toggle active={Boolean(selected.bold)} onClick={() => toggle(selected.bold, (text) => `**${text}**`)}>
                <span className="font-semibold">B</span>
              </Toggle>
              <Toggle active={Boolean(selected.italic)} onClick={() => toggle(selected.italic, (text) => `*${text}*`)}>
                <span className="italic">i</span>
              </Toggle>
              <Toggle active={Boolean(selected.link)} onClick={toggleLink}>
                <span className="underline">link</span>
              </Toggle>
            </>
          )}
        </div>
      ) : null}
    </>
  );
}

function Toggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-w-8 rounded-md px-2 py-1 transition-colors duration-150 ease-out md:hover:bg-black/5 ${
        active ? "bg-black/5 text-primary" : "text-(--fg)"
      }`}
    >
      {children}
    </button>
  );
}

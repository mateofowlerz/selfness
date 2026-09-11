"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useDeferredValue, useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import { patchWriting } from "../[slug]/actions";

const control =
  "min-h-11 rounded-md px-3 text-sm hover:bg-fg/5 focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-35";
type Draft = { base: string; text: string };

export default function InlineEditor({ slug, source }: { slug: string; source: string }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const history = useRef<string[]>([]);
  const future = useRef<string[]>([]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>({ base: source, text: source });
  const [view, setView] = useState<"write" | "preview" | "split">("write");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [fileVersion, setFileVersion] = useState<string | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [url, setUrl] = useState("");
  const selection = useRef({ start: 0, end: 0 });
  const deferredText = useDeferredValue(draft.text);
  const dirty = draft.text !== draft.base;
  const storageKey = `writing-draft:v1:${slug}`;

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null");
      if (saved && typeof saved.base === "string" && typeof saved.text === "string" && saved.base !== saved.text) {
        // Preserve the original base: a recovered draft must not overwrite newer disk edits.
        setDraft(saved);
        setStatus("Recovered your unsaved draft.");
      }
    } catch {
      setStatus("Browser draft recovery is unavailable.");
    }
  }, [storageKey]);

  useEffect(() => {
    if (!open) return;
    try {
      if (dirty) localStorage.setItem(storageKey, JSON.stringify(draft));
      else localStorage.removeItem(storageKey);
    } catch {
      setError("Could not keep a browser backup. Save your changes before closing.");
    }
  }, [draft, dirty, open, storageKey]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    if (open) {
      dialog.current?.showModal();
      textarea.current?.focus();
    }
  }, [open]);

  function enter() {
    if (!dirty) setDraft({ base: source, text: source });
    setOpen(true);
  }

  function close() {
    if (saving) return;
    dialog.current?.close();
    setOpen(false);
    setLinkOpen(false);
    launcher.current?.focus();
  }

  function update(text: string) {
    if (text === draft.text) return;
    history.current = [...history.current.slice(-99), draft.text];
    future.current = [];
    setDraft({ ...draft, text });
    setStatus("");
    setError("");
  }

  function undo(redo = false) {
    const from = redo ? future : history;
    const to = redo ? history : future;
    const text = from.current.pop();
    if (text === undefined) return;
    to.current.push(draft.text);
    setDraft({ ...draft, text });
    setStatus("");
  }

  function select(start: number, end: number) {
    requestAnimationFrame(() => {
      textarea.current?.focus();
      textarea.current?.setSelectionRange(start, end);
    });
  }

  function wrap(before: string, after = before, placeholder = "text") {
    const input = textarea.current;
    if (!input) return;
    const { selectionStart: start, selectionEnd: end } = input;
    const text = draft.text.slice(start, end) || placeholder;
    update(draft.text.slice(0, start) + before + text + after + draft.text.slice(end));
    select(start + before.length, start + before.length + text.length);
  }

  function lines(prefix: string) {
    const input = textarea.current;
    if (!input) return;
    const start = input.selectionStart === 0 ? 0 : draft.text.lastIndexOf("\n", input.selectionStart - 1) + 1;
    const selectedEnd =
      input.selectionEnd > input.selectionStart && draft.text[input.selectionEnd - 1] === "\n"
        ? input.selectionEnd - 1
        : input.selectionEnd;
    const newline = draft.text.indexOf("\n", selectedEnd);
    const end = newline < 0 ? draft.text.length : newline;
    const replacement = draft.text
      .slice(start, end)
      .split("\n")
      .map(
        (line, index) =>
          `${prefix === "1. " ? `${index + 1}. ` : prefix}${line.replace(/^(?:#{1,6} |[-*] |\d+\. |> )/, "")}`,
      )
      .join("\n");
    update(draft.text.slice(0, start) + replacement + draft.text.slice(end));
    select(start, start + replacement.length);
  }

  function openLink() {
    if (!textarea.current) return;
    selection.current = { start: textarea.current.selectionStart, end: textarea.current.selectionEnd };
    setUrl("");
    setLinkOpen(true);
  }

  function insertLink() {
    if (!/^(https?:\/\/|mailto:|\/|#)/i.test(url) || /[\s<>]/.test(url)) {
      setError("Enter a web address, email link, or a path beginning with / or #.");
      return;
    }
    const { start, end } = selection.current;
    const label = draft.text.slice(start, end) || "link text";
    const href = url.replace(/\(/g, "%28").replace(/\)/g, "%29");
    update(`${draft.text.slice(0, start)}[${label}](${href})${draft.text.slice(end)}`);
    setLinkOpen(false);
    select(start + 1, start + 1 + label.length);
  }

  async function save() {
    if (!dirty || saving) return;
    setSaving(true);
    setError("");
    const submitted = draft;
    try {
      const result = await patchWriting({
        slug,
        start: 0,
        end: submitted.base.length,
        expected: submitted.base,
        replacement: submitted.text,
        wholeDocument: true,
      });
      if (result.error) {
        setError(result.error);
        if (typeof result.currentBody === "string") setFileVersion(result.currentBody);
        return;
      }
      setDraft({ base: submitted.text, text: submitted.text });
      setStatus("Saved to the writing file.");
      setFileVersion(null);
      router.refresh();
    } catch {
      setError("Could not save. Your draft is still here; try again.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      const target = event.target;
      const typing =
        target instanceof HTMLElement &&
        (target.isContentEditable || ["INPUT", "TEXTAREA", "BUTTON"].includes(target.tagName));
      if (!open && !typing && !event.metaKey && !event.ctrlKey && !event.altKey && event.key === "e") {
        event.preventDefault();
        enter();
      }
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  });

  return (
    <>
      <button
        ref={launcher}
        type="button"
        onClick={enter}
        className="fixed right-4 bottom-4 z-50 min-h-11 rounded-md bg-bg px-3 font-mono text-xs text-muted shadow-sm hover:text-fg focus-visible:outline-2 focus-visible:outline-primary"
      >
        {dirty ? "Resume draft" : "e to edit"}
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="writing-editor-title"
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClose={() => setOpen(false)}
        className="fixed inset-0 m-auto h-dvh max-h-dvh w-screen max-w-none overflow-hidden bg-bg p-0 text-fg backdrop:bg-black/35 sm:h-[92dvh] sm:max-w-6xl sm:rounded-xl sm:border sm:border-fg/10"
        onKeyDown={(event) => {
          if (!(event.metaKey || event.ctrlKey) || event.nativeEvent.isComposing) return;
          const key = event.key.toLowerCase();
          if (key === "s") {
            event.preventDefault();
            void save();
          }
          if (event.target !== textarea.current || saving) return;
          if (key === "z") {
            event.preventDefault();
            undo(event.shiftKey);
          }
          if (key === "y") {
            event.preventDefault();
            undo(true);
          }
          if (key === "b") {
            event.preventDefault();
            wrap("**");
          }
          if (key === "i") {
            event.preventDefault();
            wrap("*");
          }
          if (key === "k") {
            event.preventDefault();
            openLink();
          }
        }}
      >
        {open ? (
          <div className="flex h-full flex-col">
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-fg/10 px-4 py-2 sm:px-6">
              <div>
                <h2 id="writing-editor-title" className="mb-0 text-base font-semibold">
                  Edit writing
                </h2>
                <p className="text-xs text-muted">{dirty ? "Unsaved changes" : "Saved"} · local file</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={save}
                  disabled={!dirty || saving}
                  className={`${control} bg-fg text-bg hover:bg-fg/85`}
                >
                  {saving ? "Saving…" : "Save changes"}
                </button>
                <button type="button" className={control} onClick={close} disabled={saving}>
                  Close
                </button>
              </div>
            </div>
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-fg/10 px-3">
              <fieldset aria-label="Editor view" className="flex">
                {(["write", "preview", "split"] as const).map((mode) => (
                  <button
                    type="button"
                    key={mode}
                    aria-pressed={view === mode}
                    onClick={() => setView(mode)}
                    className={`${control} ${view === mode ? "text-primary" : ""} ${mode === "split" ? "hidden md:block" : ""}`}
                  >
                    {mode[0].toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </fieldset>
              <div className="flex">
                <button
                  type="button"
                  className={control}
                  disabled={saving || !history.current.length}
                  onClick={() => undo()}
                >
                  Undo
                </button>
                <button
                  type="button"
                  className={control}
                  disabled={saving || !future.current.length}
                  onClick={() => undo(true)}
                >
                  Redo
                </button>
              </div>
            </div>
            {view !== "preview" ? (
              <div
                role="toolbar"
                aria-label="Text formatting"
                className="flex shrink-0 flex-wrap items-center border-b border-fg/10 px-3 py-1"
              >
                {(
                  [
                    ["Bold", () => wrap("**")],
                    ["Italic", () => wrap("*")],
                    ["Heading 1", () => lines("# ")],
                    ["Heading 2", () => lines("## ")],
                    ["Bullets", () => lines("- ")],
                    ["Numbered list", () => lines("1. ")],
                    ["Quote", () => lines("> ")],
                    ["Link", openLink],
                    ["Code", () => wrap("`")],
                    ["Highlight", () => wrap("[", "](#highlight-teal)")],
                  ] as const
                ).map(([label, action]) => (
                  <button
                    key={label}
                    type="button"
                    className={control}
                    disabled={saving}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={action}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : null}
            {linkOpen ? (
              <form
                className="flex shrink-0 flex-wrap gap-2 border-b border-fg/10 px-4 py-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  insertLink();
                }}
              >
                <label className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                  Link URL
                  <input
                    disabled={saving}
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    placeholder="https://…"
                    className="min-h-11 min-w-0 flex-1 rounded border border-fg/20 bg-bg px-2 text-base outline-primary"
                  />
                </label>
                <button className={control} type="submit" disabled={saving}>
                  Insert link
                </button>
                <button className={control} type="button" onClick={() => setLinkOpen(false)}>
                  Cancel
                </button>
              </form>
            ) : null}
            {error ? (
              <p
                role="alert"
                className="shrink-0 border-b border-primary/20 bg-primary/5 px-4 py-2 text-sm text-primary-dark"
              >
                {error}
              </p>
            ) : null}
            {fileVersion !== null ? (
              <div className="shrink-0 border-b border-fg/10 px-4 py-2 text-sm">
                <details>
                  <summary className="min-h-11 cursor-pointer py-2">Compare with the current file</summary>
                  <textarea
                    aria-label="Current file version"
                    readOnly
                    value={fileVersion}
                    className="h-36 w-full rounded border border-fg/20 bg-bg p-3 font-mono text-base"
                  />
                </details>
                <button
                  type="button"
                  className={control}
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(draft.text);
                      setStatus("Draft copied.");
                    } catch {
                      setError("Could not copy. Select the article text and copy it manually.");
                    }
                  }}
                >
                  Copy my draft
                </button>
                <button
                  type="button"
                  className={control}
                  onClick={() => {
                    history.current.push(draft.text);
                    future.current = [];
                    setDraft({ base: fileVersion, text: fileVersion });
                    setFileVersion(null);
                    setError("");
                    setStatus("Loaded the file version. Undo restores your draft for merging.");
                  }}
                >
                  Use file version
                </button>
              </div>
            ) : null}
            <div className={`grid min-h-0 flex-1 ${view === "split" ? "md:grid-cols-2" : "grid-cols-1"}`}>
              {view !== "preview" ? (
                <textarea
                  ref={textarea}
                  aria-label="Article text"
                  value={draft.text}
                  onChange={(event) => update(event.target.value)}
                  readOnly={saving}
                  spellCheck
                  autoCapitalize="sentences"
                  className="h-full min-h-0 w-full resize-none bg-transparent px-5 py-6 font-mono text-base leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40 sm:px-8"
                />
              ) : null}
              {view !== "write" ? (
                <section
                  aria-label="Article preview"
                  className={`overflow-y-auto px-5 py-6 outline-primary sm:px-8 ${view === "split" ? "hidden border-l border-fg/10 md:block" : ""}`}
                >
                  <Markdown
                    components={{
                      p: ({ children }) => <p className="mb-6">{children}</p>,
                      h3: ({ children }) => <h3 className="mb-4 text-xl font-medium">{children}</h3>,
                      a: ({ href, children }) =>
                        href?.startsWith("#highlight-") ? (
                          <mark className="bg-primary/15 text-fg underline decoration-primary/40">{children}</mark>
                        ) : (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="wrap-break-word text-primary underline"
                          >
                            {children}
                          </a>
                        ),
                      img: ({ src, alt }) =>
                        typeof src === "string" ? (
                          <Image
                            src={src}
                            alt={alt ?? ""}
                            width={800}
                            height={600}
                            unoptimized
                            className="h-auto max-w-full"
                          />
                        ) : null,
                      blockquote: ({ children }) => (
                        <blockquote className="mb-6 border-l-[3px] border-muted/30 pl-4">{children}</blockquote>
                      ),
                      ul: ({ children }) => <ul className="mb-6 list-disc pl-6">{children}</ul>,
                      ol: ({ children }) => <ol className="mb-6 list-decimal pl-6">{children}</ol>,
                      hr: () => <hr className="my-8 border-muted/20" />,
                    }}
                  >
                    {deferredText}
                  </Markdown>
                </section>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-fg/10 px-4 py-2 text-xs text-muted">
              <output>
                {status ||
                  (dirty
                    ? "Draft kept in this browser. Save to update the article."
                    : "Select text to format it. ⌘/Ctrl S to save.")}
              </output>
              <span className="tabular-nums">
                {draft.text.trim() ? draft.text.trim().split(/\s+/).length.toLocaleString() : 0} words
              </span>
            </div>
          </div>
        ) : null}
      </dialog>
    </>
  );
}

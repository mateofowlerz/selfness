"use client";

import { useEffect, useId, useRef, useState } from "react";
import Markdown from "react-markdown";

const noteComponents = {
  p: ({ children }: { children?: React.ReactNode }) => <span className="block">{children}</span>,
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a href={href} className="text-primary underline hover:text-primary-dark">
      {children}
    </a>
  ),
};

export function NoteBody({ text }: { text: string }) {
  return <Markdown components={noteComponents}>{text}</Markdown>;
}

export default function Sidenote({ id, text }: { id: string; text: string }) {
  const popupId = useId();
  const root = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);

  function cancelClose() {
    if (timer.current) clearTimeout(timer.current);
  }

  function show() {
    cancelClose();
    setOpen(true);
  }

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  useEffect(() => {
    if (!open) return;
    function dismiss(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    // biome-ignore lint/a11y/useSemanticElements: A fieldset is invalid inside article paragraphs; this inline group contains the interactive citation.
    <span
      ref={root}
      role="group"
      aria-label={`Citation ${id}`}
      className="relative inline"
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") show();
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") {
          timer.current = setTimeout(() => {
            if (!root.current?.contains(document.activeElement)) setOpen(false);
          }, 150);
        }
      }}
      onFocus={show}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <sup className="text-[0.7em] leading-none">
        <a
          href={`#fn-${id}`}
          aria-label={`Footnote ${id}`}
          aria-expanded={open}
          aria-controls={popupId}
          className="relative px-0.5 text-primary no-underline hover:text-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary after:absolute after:-inset-x-2 after:-inset-y-4"
          onClick={(event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            show();
          }}
        >
          [{id}]
        </a>
      </sup>
      <span
        id={popupId}
        role="note"
        aria-label={`Footnote ${id}`}
        className={`${open ? "fixed right-4 bottom-4 left-4 z-30 block" : "hidden"} xl:relative xl:inset-auto xl:float-right xl:clear-right xl:-mr-[17rem] xl:mb-4 xl:block xl:h-24 xl:w-60 ${open ? "xl:z-30" : "xl:z-0"}`}
      >
        <span
          className={`block rounded-sm p-4 text-left text-sm leading-relaxed font-normal xl:absolute xl:top-0 xl:right-0 xl:w-full [&_span.block+span.block]:mt-2 ${open ? "max-h-[70vh] overflow-y-auto overscroll-contain bg-[#f2efec] text-fg xl:max-h-none xl:overflow-visible" : "max-h-24 overflow-hidden text-muted [mask-image:linear-gradient(to_bottom,black_45%,transparent)]"}`}
        >
          <span className="relative block pl-4">
            <span className="absolute top-0 left-0">{id}.</span>
            <NoteBody text={text} />
          </span>
          {open && (
            <button
              type="button"
              aria-label={`Close footnote ${id}`}
              className="mt-2 min-h-11 cursor-pointer text-xs text-muted underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-primary xl:hidden"
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          )}
        </span>
      </span>
    </span>
  );
}

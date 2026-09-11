"use client";
import { useEffect, useRef } from "react";
import { buttonClass, inputClass, MessageDetail } from "../shared";
import { useSearchUrl } from "../use-search-url";

export default function Transcript() {
  const { params, hash, update } = useSearchUrl();
  const match = hash.match(/^m(\d+)$/);
  const index = match ? Number(match[1]) : 82;
  const entry = params.get("entry") ?? String(index);
  const releaseOpen = params.get("release") === "1";
  const reader = useRef<HTMLElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: A new message starts at the top of the reader.
  useEffect(() => {
    reader.current?.scrollTo({ top: 0 });
  }, [index]);

  function selectMessage(n: number) {
    update({ entry: null }, { hash: `m${n}` });
  }
  return (
    <div data-search-workspace>
      <h1 className="mb-1! text-2xl!">Read the source.</h1>
      <p className="mb-6 text-sm text-muted">
        The released transcript, with its original message numbers. Thinking and tool output are preserved as text.
      </p>
      <div className="grid items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-8">
        <aside aria-label="Transcript navigation" className="lg:sticky lg:top-5">
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (/^\d+$/.test(entry)) selectMessage(Number(entry));
            }}
          >
            <label className="min-w-0 flex-1 text-xs font-medium">
              Jump to message
              <input
                className={`${inputClass} mt-2`}
                type="text"
                inputMode="numeric"
                pattern="[0-9]+"
                required
                maxLength={10}
                title="Enter an original message number."
                value={entry}
                onChange={(e) => update({ entry: e.target.value }, { replace: true })}
              />
            </label>
            <button className={`${buttonClass} shrink-0 px-3`} type="submit">
              Go →
            </button>
          </form>
          <div className="mt-5 border-t border-muted/20 pt-4">
            <p className="mb-2 text-xs font-medium">Key passages</p>
            <div className="grid grid-cols-4 gap-1.5">
              {[99, 101, 129, 139, 835, 1102, 2137, 2144].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={index === n}
                  onClick={() => selectMessage(n)}
                  className={`min-h-11 rounded-md border px-2 py-1 text-xs tabular-nums md:min-h-9 ${index === n ? "border-primary bg-primary text-white" : "border-muted/20 text-muted hover:border-primary hover:text-primary"}`}
                >
                  #{n}
                </button>
              ))}
            </div>
          </div>
          <details
            open={releaseOpen}
            onToggle={(e) => {
              if (e.currentTarget.open !== releaseOpen) update({ release: e.currentTarget.open ? "1" : null });
            }}
            className="mt-5 border-t border-muted/20 pt-2 text-xs text-muted"
          >
            <summary className="min-h-11 cursor-pointer py-3">What is missing from this release?</summary>
            <p className="pb-3 leading-6">
              Messages 1–81 and everything after 2145 were withheld by the publisher. Some messages and sensitive values
              within the release are also redacted. Message 0 is the system message. Missing material cannot be
              reconstructed from this archive.
            </p>
          </details>
        </aside>
        <section
          ref={reader}
          aria-label="Transcript message"
          // biome-ignore lint/a11y/noNoninteractiveTabindex: The independent reader must be keyboard scrollable.
          tabIndex={0}
          className="min-w-0 border-t border-muted/20 pt-4 lg:max-h-[calc(100dvh-320px)] lg:min-h-96 lg:overflow-y-auto lg:overscroll-contain lg:pr-3 [scrollbar-gutter:stable] [&>article]:border-t-0 [&>article]:pt-0"
        >
          <MessageDetail key={index} index={index} />
        </section>
      </div>
    </div>
  );
}

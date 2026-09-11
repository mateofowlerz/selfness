"use client";
import { useEffect, useRef, useState } from "react";
import type { Message, Scope, Span } from "@/app/lib/investigation/types";

export const inputClass =
  "min-h-11 w-full rounded border border-muted/30 bg-transparent px-3 py-2 text-base text-fg focus:border-primary focus:outline-primary";
export const buttonClass =
  "inline-flex min-h-11 items-center justify-center rounded border border-muted/30 px-4 py-2 text-sm hover:border-primary hover:text-primary disabled:opacity-50";
export const linkClass = "text-primary underline underline-offset-4 hover:text-primary-dark";
export function useDataset<T>(name: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    fetch(`/api/investigation/${name}`, { signal: controller.signal, cache: attempt ? "reload" : "default" })
      .then(async (r) => {
        if (!r.ok) {
          const failure = await r.json().catch(() => ({}));
          throw new Error(failure.error || "The research data could not be loaded.");
        }
        setData(await r.json());
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => controller.abort();
  }, [name, attempt]);
  return { data, error, retry: () => setAttempt((v) => v + 1) };
}
export function LoadState({ error, retry }: { error: string; retry: () => void }) {
  return (
    <output className="my-10 block min-h-24 text-sm text-muted">
      {error || "Loading the research archive…"}
      {error ? (
        <button type="button" className={`${buttonClass} ml-3`} onClick={retry}>
          Try again
        </button>
      ) : null}
    </output>
  );
}
export function SourceLink({ index }: { index: number }) {
  return (
    <a className={linkClass} href={`/investigation/transcript#m${index}`}>
      #{index}
    </a>
  );
}

export function Highlight({
  text,
  spans,
  sections,
  scope = "both",
  groups,
}: {
  text: string;
  spans: Span[];
  sections: Span[];
  scope?: Scope;
  groups?: string[];
}) {
  const matches = spans.filter(
    (s) =>
      (scope === "both" || s.thinking === (scope === "thinking")) && (!groups || (s.group && groups.includes(s.group))),
  );
  const boundaries = [
    ...new Set([
      0,
      text.length,
      ...matches.flatMap((s) => [s.start, s.end]),
      ...sections.flatMap((s) => [s.start, s.end]),
    ]),
  ].sort((a, b) => a - b);
  return (
    <div className="whitespace-pre-wrap break-words font-mono text-[13px] leading-6 [overflow-wrap:anywhere]">
      {boundaries.slice(0, -1).map((start, i) => {
        const end = boundaries[i + 1];
        const hit = matches.find((s) => s.start <= start && s.end >= end);
        const thinking = sections.some((s) => s.thinking && s.start <= start && s.end >= end);
        return hit ? (
          <mark key={start} className="bg-primary/15 text-fg underline decoration-primary/40" title={hit.group}>
            {text.slice(start, end)}
          </mark>
        ) : (
          <span key={start} className={thinking ? "text-fg" : "text-muted"}>
            {text.slice(start, end)}
          </span>
        );
      })}
    </div>
  );
}
export function MessageBody({ message, scope, groups }: { message: Message; scope?: Scope; groups?: string[] }) {
  return (
    <div className="space-y-6">
      {["content", "tool_call", "tool_call_raw", "tool_result"].map((field) => {
        const value = message[field as keyof Message];
        if (value === undefined || value === null || value === "") return null;
        const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
        return (
          <section key={field}>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
              {field.replaceAll("_", " ")}
            </h3>
            <Highlight
              text={text}
              spans={field === "content" ? (message.spans ?? []) : []}
              sections={field === "content" ? (message.sections ?? []) : []}
              scope={scope}
              groups={groups}
            />
          </section>
        );
      })}
    </div>
  );
}
export function MessageDetail({
  index,
  scope = "both",
  groups,
  autoScroll = false,
}: {
  index: number;
  scope?: Scope;
  groups?: string[];
  autoScroll?: boolean;
}) {
  const article = useRef<HTMLElement>(null);
  const { data, error, retry } = useDataset<{ message: Message; previous: number | null; next: number | null }>(
    `message?index=${index}`,
  );
  useEffect(() => {
    if (autoScroll && data?.message.index === index && window.location.hash === `#m${index}`)
      article.current?.scrollIntoView({ block: "start" });
  }, [autoScroll, data, index]);
  if (!data || data.message.index !== index) return <LoadState error={error} retry={retry} />;
  return (
    <article ref={article} className="min-w-0 scroll-mt-6 border-t border-muted/20 pt-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 text-sm">
        <p>
          <SourceLink index={index} />{" "}
          <span className="text-muted">
            · {data.message.role} / {data.message.type}
          </span>
        </p>
        <span className="text-xs text-muted">JSONL line {data.message.source_line}</span>
      </div>
      <MessageBody message={data.message} scope={scope} groups={groups} />
      <div className="mt-6 flex justify-between text-sm">
        {data.previous !== null ? (
          <a className={linkClass} href={`/investigation/transcript#m${data.previous}`}>
            ← #{data.previous}
          </a>
        ) : (
          <span />
        )}
        {data.next !== null ? (
          <a className={linkClass} href={`/investigation/transcript#m${data.next}`}>
            #{data.next} →
          </a>
        ) : null}
      </div>
    </article>
  );
}

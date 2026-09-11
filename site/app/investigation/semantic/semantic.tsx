"use client";
import { useEffect, useRef, useState } from "react";
import type { SemanticHit } from "@/app/lib/investigation/types";
import { inputClass, linkClass } from "../shared";
import { useSearchUrl } from "../use-search-url";

type SearchResult = { query: string; hits: SemanticHit[]; error: string };
export default function Semantic() {
  const { params, update } = useSearchUrl();
  const query = (params.get("q") ?? "").slice(0, 1000);
  const normalizedQuery = query.trim();
  const [result, setResult] = useState<SearchResult>({ query: "", hits: [], error: "" });
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const cache = useRef(new Map<string, SemanticHit[]>());
  const passages = useRef<HTMLElement>(null);
  const pending = !!normalizedQuery && (busy || normalizedQuery !== result.query);

  // biome-ignore lint/correctness/useExhaustiveDependencies: The retry counter intentionally restarts a failed request.
  useEffect(() => {
    if (!normalizedQuery) {
      setResult({ query: "", hits: [], error: "" });
      setBusy(false);
      return;
    }
    const cached = cache.current.get(normalizedQuery);
    if (cached) {
      setResult({ query: normalizedQuery, hits: cached, error: "" });
      setBusy(false);
      passages.current?.scrollTo({ top: 0 });
      return;
    }
    const controller = new AbortController();
    setBusy(true);
    // Wait briefly for typing to settle; abort and ignore superseded responses.
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/investigation/semantic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: normalizedQuery, k: 10 }),
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Search could not finish.");
        if (controller.signal.aborted) return;
        const hits: SemanticHit[] = data.results.slice(0, 10);
        if (cache.current.size >= 50) cache.current.delete(cache.current.keys().next().value as string);
        cache.current.set(normalizedQuery, hits);
        setResult({ query: normalizedQuery, hits, error: "" });
        passages.current?.scrollTo({ top: 0 });
      } catch (error) {
        if (!controller.signal.aborted) {
          setResult({
            query: normalizedQuery,
            hits: [],
            error: error instanceof Error ? error.message : "Search could not finish. Please try again.",
          });
        }
      } finally {
        if (!controller.signal.aborted) setBusy(false);
      }
    }, 450);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [normalizedQuery, attempt]);

  const visibleHits = normalizedQuery ? result.hits : [];
  const error = !pending && normalizedQuery === result.query ? result.error : "";
  return (
    <div data-search-workspace className="mx-auto max-w-[920px]">
      <h1 className="mb-1! text-2xl!">Search for an idea.</h1>
      <p className="mb-5 text-sm text-muted">Describe a thought, action, or moment. Passages update as you type.</p>
      <label className="sr-only" htmlFor="semantic-query">
        Search for an idea
      </label>
      <input
        id="semantic-query"
        type="search"
        maxLength={1000}
        className={`${inputClass} bg-white/50`}
        placeholder="e.g. knowing something is wrong, then continuing"
        value={query}
        onChange={(e) => update({ q: e.target.value || null }, { replace: true })}
        aria-describedby="semantic-status"
      />
      <output id="semantic-status" className="flex min-h-12 items-center text-xs text-muted" aria-live="polite">
        {pending
          ? "Finding related passages…"
          : error
            ? "Search unavailable"
            : normalizedQuery
              ? `${visibleHits.length} passages for “${result.query}”`
              : "The 10 closest passages will appear here."}
      </output>
      {error ? (
        <div role="alert" className="mb-4 rounded-md border border-muted/20 p-4 text-sm">
          <p>{error}</p>
          <div className="mt-2 flex gap-4 text-xs">
            <button type="button" className={`${linkClass} min-h-11`} onClick={() => setAttempt((value) => value + 1)}>
              Try again
            </button>
            <a className={`${linkClass} inline-flex min-h-11 items-center`} href="/investigation/search">
              Explore with tags
            </a>
          </div>
        </div>
      ) : null}
      <section
        ref={passages}
        aria-label="Related passages"
        aria-busy={pending}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: Enable keyboard scrolling in this overflow region.
        tabIndex={0}
        className={`max-h-[calc(100dvh-465px)] min-h-72 overflow-y-auto overscroll-contain border-y border-muted/20 pr-3 [scrollbar-gutter:stable] ${pending && visibleHits.length ? "opacity-60" : ""}`}
      >
        {!visibleHits.length ? (
          <p className="py-8 text-sm text-muted">
            {pending
              ? "Searching the transcript…"
              : !normalizedQuery
                ? "Start typing to explore the transcript."
                : !error
                  ? "No passages found. Try a different description."
                  : "Your results will appear here when search is available."}
          </p>
        ) : null}
        {visibleHits.map((hit, i) => (
          <article
            key={`${hit.index}-${hit.field}-${hit.offset}`}
            className="border-b border-muted/20 py-5 last:border-b-0"
          >
            <div className="mb-3 flex items-baseline justify-between gap-3 text-xs">
              <a href={`/investigation/transcript#m${hit.index}`} className="font-medium text-primary hover:underline">
                <span className="mr-3 tabular-nums text-muted">{String(i + 1).padStart(2, "0")}</span>Message #
                {hit.index} <span aria-hidden="true">↗</span>
              </a>
              <span className="text-muted">
                {hit.role} · {hit.field.replaceAll("_", " ")}
              </span>
            </div>
            <blockquote className="whitespace-pre-wrap break-words text-sm leading-6 [overflow-wrap:anywhere]">
              {hit.text}
            </blockquote>
          </article>
        ))}
      </section>
    </div>
  );
}

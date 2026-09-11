"use client";
import { useRef, useState } from "react";
import type { SemanticHit } from "@/app/lib/investigation/types";
import { buttonClass, inputClass, linkClass, SourceLink } from "../shared";

const examples = ["Is this the real internet?", "Justifying a harmful action", "Finding an email and phone number"];
export default function Semantic() {
  const [query, setQuery] = useState("");
  const [k, setK] = useState(10);
  const [results, setResults] = useState<SemanticHit[]>([]);
  const [searched, setSearched] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  async function search(message?: number) {
    if ((!message && !query.trim()) || busy) return;
    setBusy(true);
    setError("");
    setResults([]);
    setSearched("");
    try {
      const response = await fetch("/api/investigation/semantic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message ? { message, k } : { query, k }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Search could not finish.");
      setResults(data.results);
      setSearched(message ? `passages like message #${message}` : query.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search could not finish. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <h1 className="mb-3">Search for an idea.</h1>
      <p className="mb-8 text-muted">
        Describe what you’re looking for in your own words. Explore nearby passages across the model’s reasoning,
        visible messages, and tool calls.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void search();
        }}
        className="space-y-4"
      >
        <label className="block text-sm">
          What are you looking for?
          <input
            ref={input}
            type="search"
            required
            maxLength={1000}
            className={`${inputClass} mt-2`}
            placeholder="e.g. knowing something is wrong, then continuing"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="flex items-end justify-between gap-4">
          <label className="text-sm">
            Results
            <select value={k} onChange={(e) => setK(Number(e.target.value))} className={`${inputClass} mt-2 min-w-24`}>
              {[5, 10, 20, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <button
            disabled={busy || !query.trim()}
            className="min-h-11 rounded bg-primary px-6 py-2 text-sm text-white hover:bg-primary-dark disabled:opacity-50"
            type="submit"
          >
            {busy ? "Searching…" : "Search archive →"}
          </button>
        </div>
      </form>
      <p className="mt-3 text-xs text-muted">
        Your query is sent to OpenAI to find similar passages. Source embeddings are already cached; the transcript is
        not sent again.
      </p>
      <div className="my-6 flex flex-wrap gap-2">
        {examples.map((example) => (
          <button
            key={example}
            type="button"
            className={`${buttonClass} text-xs`}
            onClick={() => {
              setQuery(example);
              input.current?.focus();
            }}
          >
            {example}
          </button>
        ))}
      </div>
      <div className="mb-6 border-y border-muted/20 py-4">
        <p className="mb-2 text-sm">Or start from a source passage.</p>
        <p className="mb-3 text-xs text-muted">
          Uses the cached message embeddings directly. No external request is needed.
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            [139, "Real or simulated?"],
            [835, "Money and verification"],
            [2137, "Publishing the package"],
          ].map(([id, label]) => (
            <button
              type="button"
              key={id}
              className={`${buttonClass} text-xs`}
              disabled={busy}
              onClick={() => void search(Number(id))}
            >
              #{id} · {label}
            </button>
          ))}
        </div>
      </div>
      <output className="block min-h-12 text-sm text-muted" aria-live="polite">
        {busy
          ? "Finding related passages…"
          : searched
            ? `${results.length} passages for “${searched}”`
            : "3,839 passages · text-embedding-3-large · cosine similarity"}
      </output>
      {error ? (
        <div role="alert" className="my-4 border-l-2 border-primary pl-4">
          <p>{error}</p>
          <a className={`${linkClass} text-sm`} href="/investigation/search">
            Explore with tags
          </a>
        </div>
      ) : null}
      <div className="space-y-6">
        {results.map((hit, i) => (
          <article key={`${hit.index}-${hit.field}-${hit.offset}`} className="border-t border-muted/20 pt-5">
            <div className="flex justify-between gap-3 text-sm">
              <p>
                <span className="mr-2 text-muted">{String(i + 1).padStart(2, "0")}</span>
                <SourceLink index={hit.index} />
              </p>
              <p className="text-xs tabular-nums text-muted">similarity {hit.score.toFixed(4)}</p>
            </div>
            <p className="mt-2 mb-4 break-all text-xs text-muted">
              {hit.role} / {hit.type} · {hit.field}
              <br />
              JSONL line {hit.source_line} · field line {hit.field_line} · offset {hit.offset}
            </p>
            <blockquote className="whitespace-pre-wrap break-words border-l-2 border-primary/30 pl-4 text-sm leading-7 [overflow-wrap:anywhere]">
              {hit.text}
            </blockquote>
            <a
              href={`/investigation/transcript#m${hit.index}`}
              className={`${linkClass} mt-4 inline-flex min-h-11 items-center text-sm`}
            >
              Read full message →
            </a>
          </article>
        ))}
      </div>
      {searched && !results.length ? (
        <p className="my-6 text-muted">No passages found. Try a different description.</p>
      ) : null}
    </>
  );
}

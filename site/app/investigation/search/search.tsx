"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { rankSignals } from "@/app/lib/investigation/search";
import type { Scope, SearchData } from "@/app/lib/investigation/types";
import { buttonClass, inputClass, LoadState, MessageDetail, useDataset } from "../shared";

export default function Search() {
  const load = useDataset<SearchData>("search");
  if (!load.data)
    return (
      <>
        <h1>Follow the reasoning.</h1>
        <LoadState {...load} />
      </>
    );
  return <SearchArchive data={load.data} />;
}
function SearchArchive({ data }: { data: SearchData }) {
  const names = useMemo(() => Object.keys(data.definitions.groups), [data]);
  const [selected, setSelected] = useState(names);
  const [scope, setScope] = useState<Scope>("both");
  const [minimum, setMinimum] = useState(4);
  const [wobble, setWobble] = useState(false);
  const [matchAll, setMatchAll] = useState(false);
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(20);
  const [current, setCurrent] = useState<number | null>(null);
  const detailRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (current !== null) detailRef.current?.scrollIntoView({ block: "start" });
  }, [current]);
  useEffect(() => {
    const update = () => {
      const match = window.location.hash.match(/^#m(\d+)$/);
      setCurrent(match ? Number(match[1]) : null);
    };
    const params = new URLSearchParams(window.location.search);
    if (params.has("groups")) setSelected((params.get("groups") ?? "").split(",").filter((g) => names.includes(g)));
    if (params.get("match") === "all") setMatchAll(true);
    update();
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, [names]);
  const ranked = useMemo(
    () =>
      rankSignals(data, scope, selected, minimum, wobble, matchAll).filter(
        (r) =>
          !query.trim() ||
          `${r.index} ${r.excerpt} ${r.summary} ${r.groups.join(" ")}`
            .toLowerCase()
            .includes(query.trim().toLowerCase()),
      ),
    [data, scope, selected, minimum, wobble, matchAll, query],
  );
  function open(index: number) {
    window.location.hash = `m${index}`;
    setCurrent(index);
  }
  function reset() {
    setSelected(names);
    setScope("both");
    setMinimum(4);
    setWobble(false);
    setMatchAll(false);
    setQuery("");
    setLimit(20);
  }
  return (
    <>
      <h1 className="mb-3">Follow the reasoning.</h1>
      <p className="mb-8 text-muted">
        Find moments where the model questions its environment, flags harm, or justifies continuing. These tags come
        from the investigation’s original regex patterns.
      </p>
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="text-sm">
            Search within excerpts & summaries
            <input
              type="search"
              className={`${inputClass} mt-2`}
              placeholder="e.g. internet, PyPI, #139"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value.replace(/^#/, ""));
                setLimit(20);
              }}
            />
          </label>
          <label className="text-sm">
            Reasoning scope
            <select
              className={`${inputClass} mt-2`}
              value={scope}
              onChange={(e) => {
                setScope(e.target.value as Scope);
                setLimit(20);
              }}
            >
              <option value="both">Thinking + visible text</option>
              <option value="thinking">Thinking only</option>
              <option value="visible">Visible text only</option>
            </select>
          </label>
        </div>
        <fieldset>
          <legend className="mb-2 text-sm">Signal groups</legend>
          <div className="flex flex-wrap gap-2">
            {names.map((name) => (
              <button
                key={name}
                type="button"
                aria-pressed={selected.includes(name)}
                title={data.definitions.groups[name].description}
                className={`min-h-11 rounded border px-3 py-2 text-left text-xs leading-5 ${selected.includes(name) ? "border-primary/30 bg-primary/5 text-primary" : "border-muted/20 text-muted hover:border-muted/50"}`}
                onClick={() => {
                  setSelected((s) => (s.includes(name) ? s.filter((g) => g !== name) : [...s, name]));
                  setLimit(20);
                }}
              >
                {name.replaceAll("_", " ")}
              </button>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 text-xs">
            <button type="button" className="min-h-11 text-muted underline" onClick={() => setSelected(names)}>
              Select all
            </button>
            <button type="button" className="min-h-11 text-muted underline" onClick={() => setSelected([])}>
              Clear tags
            </button>
            <button
              type="button"
              className="min-h-11 text-primary underline"
              onClick={() => {
                setSelected(["self_justification_via_intent", "sim_vs_real_deliberation"]);
                setMatchAll(true);
                setWobble(false);
                setMinimum(4);
              }}
            >
              Try my self-justification filter
            </button>
          </div>
        </fieldset>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-y border-muted/20 py-3">
          <label className="flex min-h-11 items-center gap-3 text-sm">
            Minimum score{" "}
            <input
              aria-label="Minimum score"
              type="range"
              min="0"
              max="24"
              className="w-24 accent-primary"
              value={minimum}
              onChange={(e) => setMinimum(Number(e.target.value))}
            />
            <span className="w-5 tabular-nums">{minimum}</span>
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              className="size-4 accent-primary"
              type="checkbox"
              checked={matchAll}
              onChange={(e) => setMatchAll(e.target.checked)}
            />
            Match every selected tag
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              className="size-4 accent-primary"
              type="checkbox"
              checked={wobble}
              onChange={(e) => setWobble(e.target.checked)}
            />
            Include self-deception similarity
          </label>
        </div>
        {wobble ? (
          <p className="text-xs text-muted">
            Adds cached vector matches at ≥ 0.25, including messages outside the selected regex tags and scope. With
            “match every tag,” only tagged candidates qualify. Similarity is a retrieval aid, not a probability.
          </p>
        ) : null}
        <details className="text-xs text-muted">
          <summary className="min-h-11 cursor-pointer py-3">How the scores and tags work</summary>
          <p className="mb-3">
            Only Assistant / TextMessage records are tagged. A score sums the weights of distinct matched groups plus
            the original co-occurrence bonuses. Thinking-only scope changes the searched text; message context remains
            complete.
          </p>
          {names.map((g) => (
            <div key={g} className="mb-4">
              <p className="font-medium text-fg">
                {g} · weight {data.definitions.groups[g].weight}
              </p>
              <p>{data.definitions.groups[g].description}</p>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words">
                {data.definitions.groups[g].patterns.join("\n")}
              </pre>
            </div>
          ))}
        </details>
      </div>
      {current !== null ? (
        <section
          ref={detailRef}
          aria-label="Selected message"
          className="my-8 rounded border border-primary/25 p-4 sm:p-5"
        >
          <div className="flex items-center justify-between">
            <h2 className="mb-0 text-lg">Message #{current}</h2>
            <button
              type="button"
              className={buttonClass}
              onClick={() => {
                setCurrent(null);
                window.history.replaceState(null, "", window.location.pathname + window.location.search);
              }}
            >
              Close
            </button>
          </div>
          <div className="mt-4">
            <MessageDetail index={current} scope={scope} groups={selected} />
          </div>
        </section>
      ) : null}
      <div className="mt-5 mb-2 flex items-center justify-between">
        <output className="text-sm text-muted">{ranked.length} matching messages</output>
        <button type="button" className="min-h-11 text-xs text-muted underline" onClick={reset}>
          Reset filters
        </button>
      </div>
      {ranked.length === 0 ? (
        <p className="my-10 text-muted">No messages match. Try selecting more tags or lowering the minimum score.</p>
      ) : null}
      <div>
        {ranked.slice(0, limit).map((r) => (
          <article key={r.index} className="border-t border-muted/20 py-5">
            <button
              type="button"
              className="group block w-full text-left"
              onClick={() => {
                open(r.index);
              }}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-medium text-primary">
                  Message #{r.index} <span aria-hidden="true">↗</span>
                </span>
                <span className="text-xs tabular-nums text-muted">
                  score {r.score}
                  {wobble && r.wobble !== null ? ` · similarity ${r.wobble.toFixed(2)}` : ""}
                </span>
              </div>
              {r.summary ? (
                <>
                  <p className="mt-2 text-sm leading-6">{r.summary.split("\n")[0]}</p>
                  <span className="text-[11px] text-muted">Kimi summary · verify against source</span>
                </>
              ) : null}
              <p className="mt-2 line-clamp-3 text-sm text-muted">{r.excerpt}</p>
              <p className="mt-3 text-[11px] text-primary/90">
                {r.groups.map((g) => g.replaceAll("_", " ")).join(" · ")}
              </p>
            </button>
          </article>
        ))}
      </div>
      {limit < ranked.length ? (
        <button type="button" className={`${buttonClass} mt-5 w-full`} onClick={() => setLimit((v) => v + 20)}>
          Show 20 more messages
        </button>
      ) : null}
    </>
  );
}

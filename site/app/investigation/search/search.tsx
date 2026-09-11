"use client";
import { useEffect, useMemo, useRef } from "react";
import { rankSignals } from "@/app/lib/investigation/search";
import type { Scope, SearchData } from "@/app/lib/investigation/types";
import { buttonClass, inputClass, LoadState, MessageDetail, useDataset } from "../shared";
import { TagChip, tagChipClass, tagLabel } from "../tag-chip";
import { useSearchUrl } from "../use-search-url";

export default function Search() {
  const load = useDataset<SearchData>("search");
  return (
    <div data-search-workspace>
      <h1 className="mb-1! text-2xl!">Follow the reasoning.</h1>
      <p className="mb-6 text-sm text-muted">Explore the transcript by tag, phrase, or message number.</p>
      {load.data ? <SearchArchive data={load.data} /> : <LoadState {...load} />}
    </div>
  );
}
function SearchArchive({ data }: { data: SearchData }) {
  const names = useMemo(() => Object.keys(data.definitions.groups), [data]);
  const { params, hash, update } = useSearchUrl();
  const selected = params.has("groups")
    ? names.filter((name) => (params.get("groups") ?? "").split(",").includes(name))
    : names;
  const scope: Scope =
    params.get("scope") === "thinking" ? "thinking" : params.get("scope") === "visible" ? "visible" : "both";
  const query = params.get("q") ?? "";
  const requestedLimit = Number(params.get("limit"));
  const limit =
    Number.isSafeInteger(requestedLimit) && requestedLimit >= 20
      ? Math.min(requestedLimit, data.scopes[scope].length)
      : 20;
  const current = /^m\d+$/.test(hash) ? Number(hash.slice(1)) : null;
  const showDefinitions = params.get("definitions") === "1";
  const currentRef = useRef<HTMLElement>(null);
  const resultList = useRef<HTMLDivElement>(null);
  // Depend on the serialized selection so unrelated URL changes do not rerank.
  const selectionKey = selected.join(",");
  const ranked = useMemo(
    () =>
      rankSignals(data, scope, selectionKey.split(",").filter(Boolean), 0, false).filter((r) => {
        const needle = query.trim().replace(/^#/, "").toLowerCase();
        return !needle || `${r.index} ${r.excerpt} ${r.summary} ${r.groups.join(" ")}`.toLowerCase().includes(needle);
      }),
    [data, scope, selectionKey, query],
  );
  const currentIsVisible = ranked.slice(0, limit).some((r) => r.index === current);
  useEffect(() => {
    if (current !== null) currentRef.current?.scrollIntoView({ block: "nearest" });
  }, [current]);
  function filter(values: Record<string, string | null>, replace = false) {
    update({ ...values, limit: null, match: null }, { replace, hash: "" });
    resultList.current?.scrollTo({ top: 0 });
  }
  function reset() {
    filter({ groups: null, scope: null, q: null, definitions: null });
  }
  function detail(index: number) {
    return (
      <section
        ref={currentRef}
        aria-label={`Message #${index} source`}
        className="mt-3 rounded-md border border-muted/20 bg-white/50 p-4"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium">Original message #{index}</span>
          <button
            type="button"
            className="min-h-11 px-2 text-xs text-muted underline md:min-h-8"
            onClick={() => update({}, { hash: "" })}
          >
            Close message
          </button>
        </div>
        <MessageDetail key={index} index={index} scope={scope} groups={selected} />
      </section>
    );
  }
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8">
      <aside aria-label="Search filters" className="lg:sticky lg:top-5">
        <label className="block text-xs font-medium">
          Search messages
          <input
            type="search"
            className={`${inputClass} mt-2`}
            placeholder="Phrase or #139"
            value={query}
            onChange={(e) => filter({ q: e.target.value || null }, true)}
          />
        </label>
        <label className="mt-4 block text-xs font-medium">
          Reasoning scope
          <select
            className={`${inputClass} mt-2`}
            value={scope}
            onChange={(e) => filter({ scope: e.target.value === "both" ? null : e.target.value })}
          >
            <option value="both">Thinking + visible text</option>
            <option value="thinking">Thinking only</option>
            <option value="visible">Visible text only</option>
          </select>
        </label>
        <fieldset className="mt-5">
          <legend className="text-xs font-medium">
            Tags{" "}
            <span className="ml-1 text-muted">
              {selected.length}/{names.length}
            </span>
          </legend>
          <p className="mt-1 mb-3 text-xs text-muted">Matches any selected tag.</p>
          <div className="flex flex-wrap gap-2">
            {names.map((name) => {
              const active = selected.includes(name);
              return (
                <button
                  key={name}
                  type="button"
                  aria-pressed={active}
                  title={data.definitions.groups[name].description}
                  className={`${tagChipClass} min-h-11 md:min-h-8 ${active ? "border-primary bg-primary text-white" : "border-muted/30 bg-transparent text-muted hover:border-muted"}`}
                  onClick={() => {
                    const next = active ? selected.filter((g) => g !== name) : [...selected, name];
                    filter({ groups: next.length === names.length ? null : next.join(",") });
                  }}
                >
                  <span aria-hidden="true" className="w-3 shrink-0 text-center">
                    {active ? "✓" : "+"}
                  </span>
                  {tagLabel(name)}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex gap-4 text-xs">
            <button
              type="button"
              className="min-h-11 text-muted underline md:min-h-8"
              onClick={() => filter({ groups: null })}
            >
              Select all
            </button>
            <button
              type="button"
              className="min-h-11 text-muted underline md:min-h-8"
              onClick={() => filter({ groups: "" })}
            >
              Clear tags
            </button>
          </div>
        </fieldset>
        <div className="mt-4 border-t border-muted/20 pt-3">
          <button
            type="button"
            aria-expanded={showDefinitions}
            aria-controls="tag-definitions"
            className="min-h-11 text-xs text-muted md:min-h-8"
            onClick={() => update({ definitions: showDefinitions ? null : "1" })}
          >
            {showDefinitions ? "−" : "+"} About these tags
          </button>
          {showDefinitions ? (
            <div id="tag-definitions" className="mt-2 space-y-4 text-xs text-muted">
              <p>
                Tags use the investigation’s original regex patterns. Summaries are generated reading aids; open a
                message for the source.
              </p>
              {names.map((name) => (
                <div key={name}>
                  <p className="font-medium text-fg">{tagLabel(name)}</p>
                  <p className="mt-1">{data.definitions.groups[name].description}</p>
                  <pre className="mt-2 whitespace-pre-wrap break-words text-[11px]">
                    {data.definitions.groups[name].patterns.join("\n")}
                  </pre>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </aside>
      <section aria-label="Matching messages" className="min-w-0">
        <div className="flex min-h-11 items-center justify-between gap-3 border-b border-muted/20 pb-2">
          <output className="text-sm tabular-nums" aria-live="polite">
            {ranked.length} <span className="text-muted">matching messages</span>
          </output>
          <button type="button" className="min-h-11 text-xs text-muted underline md:min-h-8" onClick={reset}>
            Reset filters
          </button>
        </div>
        <div
          ref={resultList}
          className="lg:max-h-[calc(100dvh-420px)] lg:min-h-96 lg:overflow-y-auto lg:overscroll-contain lg:pr-3 [scrollbar-gutter:stable]"
        >
          {current !== null && !currentIsVisible ? detail(current) : null}
          {!ranked.length ? (
            <div className="py-10">
              <p className="text-sm">
                {!selected.length ? "Choose a tag to explore the messages." : "No messages match these filters."}
              </p>
              <p className="mt-1 text-xs text-muted">
                {!selected.length
                  ? "Select all to browse every tagged message."
                  : "Try another phrase, more tags, or a broader reasoning scope."}
              </p>
            </div>
          ) : null}
          {ranked.slice(0, limit).map((r) => (
            <article key={r.index} className="border-b border-muted/20 py-4">
              <button
                type="button"
                aria-label={`${current === r.index ? "Close" : "Open"} message #${r.index}`}
                aria-expanded={current === r.index}
                className="group block w-full rounded-sm text-left"
                onClick={() => update({}, { hash: current === r.index ? "" : `m${r.index}` })}
              >
                <span className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-medium text-primary">Message #{r.index}</span>
                  <span className="text-muted group-hover:text-primary">
                    {current === r.index ? "Close message −" : "Read message +"}
                  </span>
                </span>
                {r.summary ? (
                  <p className="mt-2 text-[15px] font-medium leading-6">{r.summary.split("\n")[0]}</p>
                ) : null}
                <p
                  className={`mt-2 line-clamp-2 break-words ${r.summary ? "text-xs leading-5 text-muted" : "text-sm leading-6 text-fg"}`}
                >
                  {r.excerpt}
                </p>
                <span className="mt-3 flex flex-wrap gap-1.5">
                  {r.groups.map((name) => (
                    <TagChip key={name} name={name} />
                  ))}
                </span>
              </button>
              {current === r.index ? detail(r.index) : null}
            </article>
          ))}
          {limit < ranked.length ? (
            <button
              type="button"
              className={`${buttonClass} my-4 w-full`}
              onClick={() => update({ limit: String(limit + 20) })}
            >
              Show 20 more messages
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
}

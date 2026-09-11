"use client";
import { type Ref, useEffect, useRef } from "react";
import type { Episode, EpisodePreview, Segment } from "@/app/lib/investigation/types";
import { buttonClass, inputClass, LoadState, linkClass, SourceLink, useDataset } from "../shared";
import { TagChip } from "../tag-chip";
import { useSearchUrl } from "../use-search-url";

export default function Episodes() {
  const segments = useDataset<{ segments: Segment[] }>("segments");
  return (
    <div data-search-workspace>
      <h1 className="mb-1! text-2xl!">A story in ten stages.</h1>
      <p className="mb-6 text-sm text-muted">
        Follow the investigation through its messages, tool calls, and turning points.
      </p>
      {segments.data ? (
        <Timeline segments={segments.data.segments} />
      ) : (
        <LoadState error={segments.error} retry={segments.retry} />
      )}
    </div>
  );
}
function Timeline({ segments }: { segments: Segment[] }) {
  const { params, hash, update } = useSearchUrl();
  const query = params.get("q") ?? "";
  const stageId = Number(params.get("stage") ?? hash.match(/^stage(\d+)$/)?.[1]);
  const segment = segments.find((s) => s.id === stageId);
  const stage = segment?.id ?? 0;
  const selected = /^ep-?\d+$/.test(hash) ? Number(hash.replace(/^ep-?/, "")) : null;
  const stageParam = stage ? String(stage) : "";
  const previews = useDataset<{ episodes: EpisodePreview[]; query: string; stage: string }>(
    `episode-previews?${new URLSearchParams({ q: query, stage: stageParam })}`,
  );
  const ready = previews.data?.query === query && previews.data?.stage === stageParam;
  const filtered = ready ? (previews.data?.episodes ?? []) : [];
  const selectedIndex = filtered.findIndex((ep) => ep.ep === selected);
  const requestedStart = Number(params.get("start"));
  const initialStart = selectedIndex >= 0 ? Math.floor(selectedIndex / 20) * 20 : 0;
  const start =
    params.has("start") && Number.isSafeInteger(requestedStart) && requestedStart >= 0
      ? Math.min(requestedStart, Math.max(0, filtered.length - 1))
      : initialStart;
  const requestedLimit = Number(params.get("limit"));
  const limit =
    Number.isSafeInteger(requestedLimit) && requestedLimit >= 20
      ? Math.min(requestedLimit, Math.max(20, filtered.length))
      : 20;
  // Deep links and browser history always reveal the selected row in chronological order.
  const visibleStart = selectedIndex >= 0 ? Math.min(start, selectedIndex) : start;
  const visibleEnd = selectedIndex >= 0 ? Math.max(start + limit, selectedIndex + 1) : start + limit;
  const visible = filtered.slice(visibleStart, visibleEnd);
  const opened = new Set((params.get("open") ?? "").split(","));
  const closed = new Set((params.get("closed") ?? "").split(","));
  const selectedRef = useRef<HTMLElement>(null);
  const resultList = useRef<HTMLDivElement>(null);
  const clickedEpisode = useRef(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Filters intentionally reset the results viewport.
  useEffect(() => {
    resultList.current?.scrollTo({ top: 0 });
  }, [stage, query]);
  useEffect(() => {
    if (clickedEpisode.current) {
      clickedEpisode.current = false;
      return;
    }
    if (selected !== null && ready) selectedRef.current?.scrollIntoView({ block: "start" });
  }, [selected, ready]);

  function change(values: Record<string, string | null>, options: { replace?: boolean; hash?: string } = {}) {
    // Upgrade legacy #stage links before another action replaces their hash.
    update({ stage: stage ? String(stage) : null, signal: null, full: null, ...values }, options);
  }
  function filter(values: Record<string, string | null>, replace = false) {
    change({ ...values, start: null, limit: null, open: null, closed: null }, { replace, hash: "" });
  }
  function selectEpisode(id: number) {
    clickedEpisode.current = selected === null || selected === id;
    change(
      { start: String(visibleStart), limit: String(visibleEnd - visibleStart) },
      { hash: selected === id ? "" : `ep${id}` },
    );
  }
  function isOpen(key: string, defaultOpen: boolean) {
    return !closed.has(key) && (opened.has(key) || defaultOpen);
  }
  function toggle(key: string, defaultOpen: boolean) {
    const nextOpen = new Set(opened);
    const nextClosed = new Set(closed);
    nextOpen.delete("");
    nextClosed.delete("");
    const expand = !isOpen(key, defaultOpen);
    nextOpen.delete(key);
    nextClosed.delete(key);
    if (expand !== defaultOpen) (expand ? nextOpen : nextClosed).add(key);
    change({ open: [...nextOpen].sort().join(",") || null, closed: [...nextClosed].sort().join(",") || null });
  }
  function renderEpisode(ep: EpisodePreview) {
    return (
      <EpisodeCard
        key={ep.ep}
        episode={ep}
        selected={selected === ep.ep}
        articleRef={selected === ep.ep ? selectedRef : undefined}
        onSelect={() => selectEpisode(ep.ep)}
        isOpen={isOpen}
        toggle={toggle}
      />
    );
  }
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-8">
      <aside aria-label="Episode filters" className="lg:sticky lg:top-5">
        <label className="block text-xs font-medium">
          Search episodes
          <input
            className={`${inputClass} mt-2`}
            type="search"
            value={query}
            placeholder="Phrase or episode number"
            onChange={(e) => filter({ q: e.target.value || null }, true)}
          />
        </label>
        <nav
          aria-label="Investigation stages"
          className="mt-5 space-y-1 lg:max-h-[calc(100dvh-400px)] lg:min-h-60 lg:overflow-y-auto lg:overscroll-contain lg:pr-1 [scrollbar-gutter:stable]"
        >
          <button
            type="button"
            aria-pressed={!stage}
            onClick={() => filter({ stage: null })}
            className={`flex min-h-11 w-full items-center justify-between rounded-md border px-3 py-2 text-left text-xs md:min-h-9 ${!stage ? "border-primary bg-primary text-white" : "border-transparent text-muted hover:bg-primary/5 hover:text-primary"}`}
          >
            <span>All stages</span>
          </button>
          {segments.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={stage === s.id}
              onClick={() => filter({ stage: String(s.id) })}
              className={`flex min-h-11 w-full items-start gap-2.5 rounded-md border px-3 py-2 text-left text-xs leading-5 ${stage === s.id ? "border-primary bg-primary text-white" : "border-transparent text-muted hover:bg-primary/5 hover:text-primary"}`}
            >
              <span className="w-4 shrink-0 tabular-nums">{String(s.id).padStart(2, "0")}</span>
              <span className="flex-1">{s.label.name}</span>
            </button>
          ))}
        </nav>
      </aside>
      <section aria-label="Episodes" className="min-w-0">
        <div className="flex min-h-11 items-center justify-between gap-3 border-b border-muted/20 pb-2">
          <p className="text-xs text-muted">Select an episode to read it here.</p>
          <button
            className="min-h-11 text-xs text-muted underline md:min-h-8"
            type="button"
            onClick={() =>
              change({ stage: null, q: null, start: null, limit: null, open: null, closed: null }, { hash: "" })
            }
          >
            Reset filters
          </button>
        </div>
        <div
          ref={resultList}
          className="[overflow-anchor:none] lg:max-h-[calc(100dvh-420px)] lg:min-h-96 lg:overflow-y-auto lg:overscroll-contain lg:pr-3 [scrollbar-gutter:stable]"
        >
          {segment ? (
            <section aria-label={`Stage ${stage} summary`} className="border-b border-muted/20 py-4">
              <p className="mb-2 text-xs text-muted">
                Stage {stage} · {segment.minutes} minutes
              </p>
              <h2 className="mb-2! text-lg! font-medium">{segment.label.name}</h2>
              {(Array.isArray(segment.label.summary) ? segment.label.summary : [segment.label.summary]).map((text) => (
                <p key={text} className="mb-2 text-sm leading-6">
                  {text}
                </p>
              ))}
              <p className="text-xs leading-5 text-muted">{segment.label.handoff}</p>
              <p className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                <span className="text-muted">Milestones</span>
                {segment.label.milestone_messages.map((n) => (
                  <SourceLink key={n} index={n} />
                ))}
              </p>
            </section>
          ) : null}
          {!ready ? <LoadState error={previews.error} retry={previews.retry} /> : null}
          {ready && selected !== null && selectedIndex < 0 ? (
            <p role="alert" className="py-4 text-sm text-muted">
              This episode is unavailable or outside the current filters.{" "}
              {query || stage ? (
                <button
                  type="button"
                  className={`${linkClass} mr-3`}
                  onClick={() => change({ q: null, stage: null, start: null, limit: null })}
                >
                  Clear filters
                </button>
              ) : null}
              <button type="button" className={linkClass} onClick={() => change({}, { hash: "" })}>
                Close
              </button>
            </p>
          ) : null}
          {visibleStart > 0 ? (
            <button
              type="button"
              className={`${buttonClass} my-4 w-full`}
              onClick={() =>
                change({
                  start: String(Math.max(0, visibleStart - 20)),
                  limit: String(visibleEnd - Math.max(0, visibleStart - 20)),
                })
              }
            >
              Show earlier episodes
            </button>
          ) : null}
          {ready && !filtered.length ? (
            <p className="py-10 text-sm text-muted">No episodes match. Try a broader phrase or clear the filters.</p>
          ) : null}
          {visible.map(renderEpisode)}
          {visibleEnd < filtered.length ? (
            <button
              type="button"
              className={`${buttonClass} my-4 w-full`}
              onClick={() => change({ start: String(visibleStart), limit: String(visibleEnd - visibleStart + 20) })}
            >
              Show more episodes
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
}

type DisclosureProps = {
  isOpen: (key: string, defaultOpen: boolean) => boolean;
  toggle: (key: string, defaultOpen: boolean) => void;
};
function EpisodeCard({
  episode: ep,
  selected,
  articleRef,
  onSelect,
  isOpen,
  toggle,
}: {
  episode: EpisodePreview;
  selected: boolean;
  articleRef?: Ref<HTMLElement>;
  onSelect: () => void;
} & DisclosureProps) {
  return (
    <article ref={articleRef} aria-label={`Episode ${ep.ep}`} className="min-w-0 scroll-mt-3 border-b border-muted/20">
      <button
        type="button"
        aria-expanded={selected}
        aria-controls={`episode-${ep.ep}-body`}
        aria-label={`${selected ? "Close" : "Open"} episode ${ep.ep}`}
        onClick={onSelect}
        className={`block w-full rounded-md px-3 py-4 text-left transition-colors hover:bg-primary/5 ${selected ? "bg-primary/5" : ""}`}
      >
        <span className="mb-2 flex items-center justify-between gap-3 text-xs">
          <span className="font-medium text-primary">Episode {ep.ep}</span>
          <span className="flex items-center gap-4 text-muted">
            <span>{ep.ts_start?.slice(11)}</span>
            <span aria-hidden="true" className="text-lg text-primary">
              {selected ? "−" : "+"}
            </span>
          </span>
        </span>
        {ep.groups.length ? (
          <span className="mb-2 flex flex-wrap gap-1.5">
            {ep.groups.map((g) => (
              <TagChip key={g} name={g} />
            ))}
          </span>
        ) : null}
        {!selected ? <span className="line-clamp-2 text-sm leading-6 text-muted">{ep.preview}</span> : null}
      </button>
      {selected ? (
        <div id={`episode-${ep.ep}-body`} className="px-3 pb-5 pt-3">
          <EpisodeDetail key={ep.ep} index={ep.ep} isOpen={isOpen} toggle={toggle} />
        </div>
      ) : null}
    </article>
  );
}

function EpisodeDetail({ index, isOpen, toggle }: { index: number } & DisclosureProps) {
  const { data, error, retry } = useDataset<{ episode: Episode }>(`episode?index=${index}`);
  if (!data || data.episode.ep !== index) return <LoadState error={error} retry={retry} />;
  const ep = data.episode;
  const expanded = true;
  const toolsKey = `${ep.ep}.tools`;
  const artifactsKey = `${ep.ep}.artifacts`;
  const toolsOpen = isOpen(toolsKey, false);
  const artifactsOpen = isOpen(artifactsKey, false);
  const artifacts = Object.entries(ep.artifacts).filter(([, items]) => items.length);
  return (
    <>
      <p className="mb-4 text-xs text-muted">
        Messages <SourceLink index={ep.idx_first} />
        {ep.idx_first !== ep.idx_last ? (
          <>
            {" "}
            – <SourceLink index={ep.idx_last} />
          </>
        ) : null}
      </p>
      {ep.note ? <p className="mb-3 text-sm leading-6 text-muted">{ep.note}</p> : null}
      {ep.thinking ? (
        <Expandable
          id={`${ep.ep}.thinking`}
          label="Thinking"
          text={ep.thinking}
          expanded={isOpen(`${ep.ep}.thinking`, expanded)}
          onToggle={() => toggle(`${ep.ep}.thinking`, expanded)}
        />
      ) : null}
      {ep.visible ? (
        <Expandable
          id={`${ep.ep}.visible`}
          label="Visible text"
          text={ep.visible}
          expanded={isOpen(`${ep.ep}.visible`, expanded)}
          onToggle={() => toggle(`${ep.ep}.visible`, expanded)}
        />
      ) : null}
      {artifacts.length ? (
        <div className="mt-2 text-xs">
          <button
            type="button"
            aria-expanded={artifactsOpen}
            aria-controls={`ep-${artifactsKey}`}
            className="min-h-11 text-muted md:min-h-8"
            onClick={() => toggle(artifactsKey, false)}
          >
            {artifactsOpen ? "−" : "+"} Referenced artifacts
          </button>
          {artifactsOpen ? (
            <div id={`ep-${artifactsKey}`} className="mt-2 rounded-md border border-muted/20 p-3">
              {artifacts.map(([kind, items]) => (
                <p key={kind} className="mb-2 break-words text-muted last:mb-0 [overflow-wrap:anywhere]">
                  <strong className="font-medium text-fg">{kind}: </strong>
                  {items.join(" · ")}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      {ep.tools.length ? (
        <div className="mt-1 text-sm">
          <button
            type="button"
            aria-expanded={toolsOpen}
            aria-controls={`ep-${toolsKey}`}
            className="min-h-11 text-xs text-muted md:min-h-8"
            onClick={() => toggle(toolsKey, false)}
          >
            {toolsOpen ? "−" : "+"} {ep.tools.length} tool calls
          </button>
          {toolsOpen ? (
            <div id={`ep-${toolsKey}`} className="mt-2 space-y-4 rounded-md border border-muted/20 bg-white/40 p-3">
              {ep.tools.map((tool) => (
                <div key={tool.idx} className="min-w-0 border-l-2 border-muted/20 pl-3">
                  <p className="mb-2 text-xs">
                    <SourceLink index={tool.idx} /> · {tool.name}
                  </p>
                  <pre className="whitespace-pre-wrap break-words text-xs leading-5 text-muted [overflow-wrap:anywhere]">
                    {tool.call_preview}
                  </pre>
                  <pre className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 [overflow-wrap:anywhere]">
                    {tool.result_preview}
                  </pre>
                  <a
                    className={`${linkClass} mt-2 inline-flex min-h-11 items-center text-xs md:min-h-8`}
                    href={`/investigation/transcript#m${tool.idx}`}
                  >
                    Read full call and result →
                  </a>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
function Expandable({
  id,
  label,
  text,
  expanded,
  onToggle,
}: {
  id: string;
  label: string;
  text: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="mb-3">
      <p className="mb-1 text-[11px] uppercase tracking-wide text-muted">{label}</p>
      <p
        id={`ep-${id}`}
        className={`whitespace-pre-wrap break-words text-sm leading-6 [overflow-wrap:anywhere] ${expanded || text.length <= 300 ? "" : "line-clamp-3"}`}
      >
        {text}
      </p>
      {text.length > 300 ? (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={`ep-${id}`}
          aria-label={`${expanded ? "Collapse" : "Expand"} ${label.toLowerCase()} for episode ${id.split(".")[0]}`}
          className="min-h-11 text-xs text-primary md:min-h-8"
          onClick={onToggle}
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      ) : null}
    </div>
  );
}

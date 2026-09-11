"use client";
import { type Ref, useEffect, useMemo, useRef } from "react";
import type { Episode, Segment } from "@/app/lib/investigation/types";
import { buttonClass, inputClass, LoadState, linkClass, SourceLink, useDataset } from "../shared";
import { TagChip } from "../tag-chip";
import { useSearchUrl } from "../use-search-url";

export default function Episodes() {
  const episodes = useDataset<{ episodes: Episode[] }>("episodes");
  const segments = useDataset<{ segments: Segment[] }>("segments");
  return (
    <div data-search-workspace>
      <h1 className="mb-1! text-2xl!">A story in ten stages.</h1>
      <p className="mb-6 text-sm text-muted">
        Follow the investigation through its messages, tool calls, and turning points.
      </p>
      {episodes.data && segments.data ? (
        <Timeline episodes={episodes.data.episodes} segments={segments.data.segments} />
      ) : (
        <LoadState
          error={episodes.error || segments.error}
          retry={() => {
            episodes.retry();
            segments.retry();
          }}
        />
      )}
    </div>
  );
}
function Timeline({ episodes, segments }: { episodes: Episode[]; segments: Segment[] }) {
  const { params, hash, update } = useSearchUrl();
  const query = params.get("q") ?? "";
  const alarm = params.get("signal") === "1";
  const full = params.get("full") === "1";
  const stageId = Number(params.get("stage") ?? hash.match(/^stage(\d+)$/)?.[1]);
  const segment = segments.find((s) => s.id === stageId);
  const stage = segment?.id ?? 0;
  const selected = /^ep-?\d+$/.test(hash) ? Number(hash.replace(/^ep-?/, "")) : null;
  const requestedLimit = Number(params.get("limit"));
  const limit =
    Number.isSafeInteger(requestedLimit) && requestedLimit >= 20 ? Math.min(requestedLimit, episodes.length) : 20;
  const opened = new Set((params.get("open") ?? "").split(","));
  const closed = new Set((params.get("closed") ?? "").split(","));
  const selectedRef = useRef<HTMLElement>(null);
  const resultList = useRef<HTMLDivElement>(null);
  const searchable = useMemo(
    () =>
      episodes.map((ep) => ({
        ep,
        text: [
          String(ep.ep),
          ep.thinking,
          ep.visible,
          ep.note ?? "",
          ...ep.groups.map((g) => g.replaceAll("_", " ")),
          ...ep.tools.map((t) => `${t.name} ${t.call_preview} ${t.result_preview}`),
          ...Object.values(ep.artifacts).flat(),
        ]
          .join(" ")
          .toLowerCase(),
      })),
    [episodes],
  );
  const filtered = useMemo(() => {
    const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
    return searchable
      .filter(
        ({ ep, text }) =>
          (!segment || (ep.ep >= segment.ep_start && ep.ep <= segment.ep_end)) &&
          (!alarm || (ep.wobble ?? 0) >= 0.25) &&
          terms.every((term) => text.includes(term)),
      )
      .map(({ ep }) => ep);
  }, [searchable, segment, query, alarm]);
  const visible = filtered.slice(0, limit);
  const focus = episodes.find((ep) => ep.ep === selected);
  const signals = filtered.filter((ep) => (ep.wobble ?? 0) >= 0.25);
  const previous = signals.findLast((ep) => ep.ep < (selected ?? Infinity));
  const next = signals.find((ep) => ep.ep > (selected ?? 0));

  // Back/Forward should restore the same selection without retaining another stage's scroll.
  // biome-ignore lint/correctness/useExhaustiveDependencies: These filters intentionally reset the results viewport.
  useEffect(() => {
    resultList.current?.scrollTo({ top: 0 });
  }, [stage, query, alarm]);
  useEffect(() => {
    if (selected !== null) selectedRef.current?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  function change(values: Record<string, string | null>, options: { replace?: boolean; hash?: string } = {}) {
    // Upgrade legacy #stage links before another action replaces their hash.
    update({ stage: stage ? String(stage) : null, ...values }, options);
  }
  function filter(values: Record<string, string | null>, replace = false) {
    change({ ...values, limit: null }, { replace, hash: "" });
  }
  function selectEpisode(id: number) {
    change({}, { hash: selected === id ? "" : `ep${id}` });
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
  function renderEpisode(ep: Episode) {
    return (
      <EpisodeCard
        key={ep.ep}
        episode={ep}
        selected={selected === ep.ep}
        full={full}
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
          className="mt-5 space-y-1 lg:max-h-[calc(100dvh-560px)] lg:min-h-60 lg:overflow-y-auto lg:overscroll-contain lg:pr-1 [scrollbar-gutter:stable]"
        >
          <button
            type="button"
            aria-pressed={!stage}
            onClick={() => filter({ stage: null })}
            className={`flex min-h-11 w-full items-center justify-between rounded-md border px-3 py-2 text-left text-xs md:min-h-9 ${!stage ? "border-primary bg-primary text-white" : "border-transparent text-muted hover:bg-primary/5 hover:text-primary"}`}
          >
            <span>All stages</span>
            <span className="tabular-nums">{episodes.length}</span>
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
              <span className="tabular-nums">{s.n_episodes}</span>
            </button>
          ))}
        </nav>
        <div className="mt-4 border-t border-muted/20 pt-3 text-xs">
          <label className="flex min-h-11 items-center gap-2 md:min-h-9">
            <input
              className="size-4 accent-primary"
              type="checkbox"
              checked={alarm}
              onChange={(e) => filter({ signal: e.target.checked ? "1" : null })}
            />
            Self-deception similarity ≥ 0.25
          </label>
          <label className="flex min-h-11 items-center gap-2 md:min-h-9">
            <input
              className="size-4 accent-primary"
              type="checkbox"
              checked={full}
              onChange={(e) => change({ full: e.target.checked ? "1" : null, open: null, closed: null })}
            />
            Expand episode text
          </label>
        </div>
      </aside>
      <section aria-label="Episodes" className="min-w-0">
        <div className="flex min-h-11 items-center justify-between gap-3 border-b border-muted/20 pb-2">
          <output className="text-sm tabular-nums" aria-live="polite">
            {filtered.length} <span className="text-muted">episodes{stage ? ` · stage ${stage}` : ""}</span>
          </output>
          <button
            className="min-h-11 text-xs text-muted underline md:min-h-8"
            type="button"
            onClick={() =>
              change(
                { stage: null, q: null, signal: null, full: null, limit: null, open: null, closed: null },
                { hash: "" },
              )
            }
          >
            Reset filters
          </button>
        </div>
        <div
          ref={resultList}
          className="lg:max-h-[calc(100dvh-420px)] lg:min-h-96 lg:overflow-y-auto lg:overscroll-contain lg:pr-3 [scrollbar-gutter:stable]"
        >
          {segment ? (
            <section aria-label={`Stage ${stage} summary`} className="border-b border-muted/20 py-4">
              <p className="mb-2 text-xs text-muted">
                Stage {stage} · {segment.minutes} minutes · episodes {segment.ep_start}–{segment.ep_end}
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
          <div className="flex items-center justify-between gap-3 border-b border-muted/20 py-2">
            <button
              type="button"
              disabled={!previous}
              className="min-h-11 text-xs text-muted hover:text-primary md:min-h-8"
              onClick={() => previous && change({}, { hash: `ep${previous.ep}` })}
            >
              ← Previous signal
            </button>
            <button
              type="button"
              disabled={!next}
              className="min-h-11 text-xs text-muted hover:text-primary md:min-h-8"
              onClick={() => next && change({}, { hash: `ep${next.ep}` })}
            >
              Next signal →
            </button>
          </div>
          {selected !== null && !visible.some((ep) => ep.ep === selected) ? (
            focus ? (
              renderEpisode(focus)
            ) : (
              <p role="alert" className="py-4 text-sm">
                This episode is not in the archive.{" "}
                <button type="button" className={linkClass} onClick={() => change({}, { hash: "" })}>
                  Close
                </button>
              </p>
            )
          ) : null}
          {!filtered.length ? (
            <p className="py-10 text-sm text-muted">No episodes match. Try a broader phrase or clear the filters.</p>
          ) : null}
          {visible.map(renderEpisode)}
          {limit < filtered.length ? (
            <button
              type="button"
              className={`${buttonClass} my-4 w-full`}
              onClick={() => change({ limit: String(limit + 20) })}
            >
              Show 20 more episodes
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
  full,
  articleRef,
  onSelect,
  isOpen,
  toggle,
}: {
  episode: Episode;
  selected: boolean;
  full: boolean;
  articleRef?: Ref<HTMLElement>;
  onSelect: () => void;
} & DisclosureProps) {
  const expanded = full || selected;
  const toolsKey = `${ep.ep}.tools`;
  const artifactsKey = `${ep.ep}.artifacts`;
  const toolsOpen = isOpen(toolsKey, expanded);
  const artifactsOpen = isOpen(artifactsKey, false);
  const artifacts = Object.entries(ep.artifacts).filter(([, items]) => items.length);
  return (
    <article
      ref={articleRef}
      aria-label={`Episode ${ep.ep}`}
      className={`min-w-0 scroll-mt-3 border-b border-muted/20 py-4 ${selected ? "rounded-md bg-primary/5 px-3" : ""}`}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        <button
          type="button"
          aria-expanded={selected}
          aria-label={`${selected ? "Close" : "Open"} episode ${ep.ep}`}
          className="min-h-11 font-medium text-primary md:min-h-8"
          onClick={onSelect}
        >
          Episode {ep.ep} <span aria-hidden="true">{selected ? "−" : "+"}</span>
        </button>
        <p className="text-muted">
          <SourceLink index={ep.idx_first} />
          {ep.idx_first !== ep.idx_last ? (
            <>
              {" "}
              – <SourceLink index={ep.idx_last} />
            </>
          ) : null}{" "}
          · {ep.ts_start?.slice(11)}
        </p>
      </div>
      {ep.groups.length ? (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {ep.groups.map((g) => (
            <TagChip key={g} name={g} />
          ))}
        </div>
      ) : null}
      {ep.note ? <p className="text-sm leading-6 text-muted">{ep.note}</p> : null}
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
            onClick={() => toggle(toolsKey, expanded)}
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
    </article>
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

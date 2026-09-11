"use client";
import Image from "next/image";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { EpisodePreview, Segment } from "@/app/lib/investigation/types";
import { buttonClass, LoadState, linkClass, useDataset } from "../shared";
import { TagChip } from "../tag-chip";
import { useSearchUrl } from "../use-search-url";
import { type DisclosureProps, EpisodeContent } from "./episode-content";

const PAGE = 8;
const clamp = (n: number, min = 0, max = 1) => Math.max(min, Math.min(max, n));
function episodeWindow(params: URLSearchParams, index: number, total: number) {
  const start = Number(params.get("start"));
  const limit = Number(params.get("limit"));
  if (
    params.has("start") &&
    Number.isSafeInteger(start) &&
    start >= 0 &&
    Number.isSafeInteger(limit) &&
    limit > 0 &&
    index >= start &&
    index < start + limit
  )
    return { start, end: Math.min(start + limit, total) };
  return { start: index, end: Math.min(index + PAGE, total) };
}
const chapterFor = (ep: number, segments: Segment[]) =>
  segments.find((s) => ep >= s.ep_start && ep <= s.ep_end) ?? segments[0];

export default function Episodes() {
  const { params, update } = useSearchUrl();
  useEffect(() => {
    if (params.has("q")) update({ q: null, start: null, limit: null }, { replace: true });
  }, [params, update]);
  const segments = useDataset<{ segments: Segment[] }>("segments");
  const previews = useDataset<{ episodes: EpisodePreview[] }>("episode-previews");
  return (
    <div data-search-workspace>
      <div className="mb-5">
        <h1 className="mb-1! text-2xl!">Timeline of Mythos adventure through the internet</h1>
        <p className="text-sm text-muted">
          Based on{" "}
          <a
            href="https://www.anthropic.com/research/alignment-assessment-cybersecurity-incidents"
            className={linkClass}
          >
            Anthropic&apos;s cybersecurity investigation transcripts
          </a>
        </p>
      </div>
      {previews.data && segments.data ? (
        previews.data.episodes.length ? (
          <Timeline episodes={previews.data.episodes} segments={segments.data.segments} />
        ) : (
          <p className="py-10 text-sm text-muted">No episodes are available.</p>
        )
      ) : (
        <LoadState
          error={previews.error || segments.error}
          retry={() => {
            previews.retry();
            segments.retry();
          }}
        />
      )}
    </div>
  );
}

function Timeline({ episodes, segments }: { episodes: EpisodePreview[]; segments: Segment[] }) {
  const { params, hash, update } = useSearchUrl();
  const targetId = /^ep-?\d+$/.test(hash) ? Number(hash.replace(/^ep-?/, "")) : null;
  const legacyStage = Number(params.get("stage") ?? hash.match(/^stage(\d+)$/)?.[1]);
  const requestedTarget = targetId ?? segments.find((s) => s.id === legacyStage)?.ep_start ?? episodes[0].ep;
  const initialTarget = episodes.some((ep) => ep.ep === requestedTarget) ? requestedTarget : episodes[0].ep;
  const initialIndex = Math.max(
    0,
    episodes.findIndex((ep) => ep.ep === initialTarget),
  );
  const [range, setRange] = useState(() => episodeWindow(params, initialIndex, episodes.length));
  const [active, setActive] = useState(initialTarget);
  const chapterOpen = params.get("timeline") === "1";
  const [rootElement, setRootElement] = useState<HTMLElement | null>(null);
  const reader = useRef<HTMLElement>(null);
  const setReader = useCallback((node: HTMLElement | null) => {
    reader.current = node;
    setRootElement(node);
  }, []);
  const sidebar = useRef<HTMLElement>(null);
  const fill = useRef<SVGRectElement>(null);
  const percent = useRef<HTMLSpanElement>(null);
  const frame = useRef(0);
  const urlTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const writtenLocation = useRef("");
  const pending = useRef<{ ep: number; fraction: number } | null>({
    ep: initialTarget,
    fraction: clamp(Number(params.get("at") ?? 0) / 1000),
  });
  const prependAnchor = useRef<{ height: number; top: number } | null>(null);
  const canLoadEarlier = useRef(false);
  const chapter = chapterFor(active, segments);
  const visible = episodes.slice(range.start, range.end);
  const opened = new Set((params.get("open") ?? "").split(","));
  const closed = new Set((params.get("closed") ?? "").split(","));
  const locationKey = `${hash}|${params.get("at") ?? "0"}|${params.get("stage") ?? ""}`;

  const restore = useCallback((ep: number) => {
    const anchor = pending.current;
    const root = reader.current;
    if (!root || !anchor || anchor.ep !== ep) return;
    const row = root.querySelector<HTMLElement>(`[data-episode="${ep}"]`);
    if (!row) return;
    root.scrollTop +=
      row.getBoundingClientRect().top - root.getBoundingClientRect().top - 24 + row.offsetHeight * anchor.fraction;
    pending.current = null;
  }, []);

  // Scroll updates replace the URL; explicit jumps and browser history restore it.
  // biome-ignore lint/correctness/useExhaustiveDependencies: Only a URL position change should restore the reader.
  useEffect(() => {
    if (writtenLocation.current === locationKey) return;
    if (urlTimer.current) clearTimeout(urlTimer.current);
    const stage = Number(params.get("stage") ?? hash.match(/^stage(\d+)$/)?.[1]);
    const id = targetId ?? segments.find((s) => s.id === stage)?.ep_start ?? episodes[0].ep;
    const index = episodes.findIndex((ep) => ep.ep === id);
    if (index < 0) {
      pending.current = null;
      return;
    }
    pending.current = { ep: id, fraction: clamp(Number(params.get("at") ?? 0) / 1000) };
    setActive(id);
    canLoadEarlier.current = false;
    const restoredRange = episodeWindow(params, index, episodes.length);
    setRange((old) => (old.start === restoredRange.start && old.end === restoredRange.end ? old : restoredRange));
    const row = reader.current?.querySelector<HTMLElement>(`[data-episode="${id}"]`);
    if (row) {
      const root = reader.current;
      if (root) root.scrollTop += row.getBoundingClientRect().top - root.getBoundingClientRect().top - 24;
      if (row.dataset.loaded === "true") restore(id);
    }
  }, [locationKey]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Preserve the viewport after a range changes.
  useLayoutEffect(() => {
    const root = reader.current;
    if (root && prependAnchor.current) {
      root.scrollTop = prependAnchor.current.top + root.scrollHeight - prependAnchor.current.height;
      prependAnchor.current = null;
    } else if (root && pending.current) {
      const row = root.querySelector<HTMLElement>(`[data-episode="${pending.current.ep}"]`);
      if (row) root.scrollTop += row.getBoundingClientRect().top - root.getBoundingClientRect().top - 24;
    }
  }, [range]);

  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
      if (urlTimer.current) clearTimeout(urlTimer.current);
    },
    [],
  );

  useEffect(() => {
    const nav = sidebar.current;
    if (!chapterOpen && nav?.clientHeight === 0) return;
    const selected = nav?.querySelector<HTMLElement>(`[data-chapter="${chapter.id}"]`);
    if (nav && selected) {
      const top = selected.getBoundingClientRect().top - nav.getBoundingClientRect().top + nav.scrollTop;
      if (top < nav.scrollTop || top + selected.offsetHeight > nav.scrollTop + nav.clientHeight)
        nav.scrollTo({ top: Math.max(0, top - 20), behavior: "instant" });
    }
  }, [chapter.id, chapterOpen]);

  function jump(id: number) {
    if (urlTimer.current) clearTimeout(urlTimer.current);
    writtenLocation.current = "";
    update(
      { timeline: null, at: null, stage: null, start: null, limit: null, signal: null, full: null },
      { hash: `ep${id}` },
    );
    // Re-clicking the current stop still returns to its beginning.
    if (hash === `ep${id}` && !params.get("at")) {
      pending.current = { ep: id, fraction: 0 };
      restore(id);
    }
  }
  function loadMore(earlier = false) {
    if (pending.current) return;
    const root = reader.current;
    if (earlier && root) prependAnchor.current = { height: root.scrollHeight, top: root.scrollTop };
    const next = earlier
      ? { start: Math.max(0, range.start - PAGE), end: range.end }
      : { start: range.start, end: Math.min(episodes.length, range.end + PAGE) };
    if (next.start === range.start && next.end === range.end) return;
    setRange(next);
    update({ start: String(next.start), limit: String(next.end - next.start) }, { replace: true });
  }
  function onScroll() {
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const root = reader.current;
      if (!root || pending.current) return;
      if (root.scrollTop > 120) canLoadEarlier.current = true;
      const line = root.getBoundingClientRect().top + 24;
      const rows = Array.from(root.querySelectorAll<HTMLElement>("[data-episode]"));
      const row = rows.findLast((el) => el.getBoundingClientRect().top <= line) ?? rows[0];
      if (!row) return;
      const id = Number(row.dataset.episode);
      const index = episodes.findIndex((ep) => ep.ep === id);
      let fraction = clamp((line - row.getBoundingClientRect().top) / row.offsetHeight);
      const atEnd = range.end === episodes.length && root.scrollTop + root.clientHeight >= root.scrollHeight - 3;
      if (atEnd) fraction = 1;
      const progress = atEnd ? 1 : (index + fraction) / episodes.length;
      fill.current?.setAttribute("transform", `scale(${progress} 1)`);
      fill.current?.parentElement?.setAttribute("aria-valuenow", String(Math.floor(progress * 100)));
      if (percent.current) percent.current.textContent = `${Math.floor(progress * 100)}%`;
      setActive(id);
      const offset = Math.round(fraction * 1000);
      if (urlTimer.current) clearTimeout(urlTimer.current);
      urlTimer.current = setTimeout(() => {
        writtenLocation.current = `ep${id}|${offset}|`;
        update(
          {
            at: offset ? String(offset) : null,
            stage: null,
            start: String(range.start),
            limit: String(range.end - range.start),
          },
          { replace: true, hash: `ep${id}` },
        );
      }, 180);
    });
  }
  function isOpen(key: string, defaultOpen: boolean) {
    return !closed.has(key) && (opened.has(key) || defaultOpen);
  }
  function toggle(key: string, defaultOpen: boolean) {
    const nextOpen = new Set(opened);
    const nextClosed = new Set(closed);
    nextOpen.delete("");
    nextClosed.delete("");
    nextOpen.delete(key);
    nextClosed.delete(key);
    if (isOpen(key, defaultOpen) === defaultOpen) (defaultOpen ? nextClosed : nextOpen).add(key);
    update({ open: [...nextOpen].sort().join(",") || null, closed: [...nextClosed].sort().join(",") || null });
  }
  const activeIndex = Math.max(
    0,
    episodes.findIndex((ep) => ep.ep === active),
  );
  const nearby = episodes.filter((ep) => chapterFor(ep.ep, segments).id === chapter.id);
  const currentInChapter = Math.max(
    0,
    nearby.findIndex((ep) => ep.ep === active),
  );
  const stops = nearby.slice(Math.max(0, currentInChapter - 2), Math.max(5, currentInChapter + 3));
  return (
    <div className="grid gap-5 lg:grid-cols-[288px_minmax(0,1fr)] lg:gap-10">
      <aside className="min-w-0">
        <button
          type="button"
          className={`${buttonClass} w-full justify-between lg:hidden`}
          aria-expanded={chapterOpen}
          onClick={() => update({ timeline: chapterOpen ? null : "1" })}
        >
          <span>
            Stage {chapter.id} · Episode {active}
          </span>
          <span aria-hidden="true">{chapterOpen ? "−" : "+"}</span>
        </button>
        <nav
          ref={sidebar}
          aria-label="Episode timeline"
          className={`${chapterOpen ? "block" : "hidden"} relative mt-3 max-h-96 overflow-y-auto overscroll-contain pr-3 lg:mt-0 lg:block lg:max-h-[calc(100dvh-285px)] lg:min-h-96 [scrollbar-gutter:stable]`}
        >
          <p className="mb-4 text-[10px] font-medium uppercase tracking-[0.18em] text-muted">The investigation</p>
          {segments.map((s) => {
            const first = episodes.find((ep) => chapterFor(ep.ep, segments).id === s.id);
            if (!first) return null;
            const current = chapter.id === s.id;
            const passed = active > s.ep_end;
            return (
              <div key={s.id} data-chapter={s.id} className="relative pb-4 last:pb-0">
                <div
                  aria-hidden="true"
                  className={`absolute bottom-0 left-[21px] top-11 w-px ${passed ? "bg-primary/60" : "bg-muted/20"}`}
                />
                <button
                  type="button"
                  onClick={() => jump(first.ep)}
                  aria-current={current ? "step" : undefined}
                  className={`relative flex w-full items-center gap-3 rounded-md pr-2 text-left motion-safe:transition-colors ${current ? "text-fg" : "text-muted hover:text-fg"}`}
                >
                  <Image
                    src={`/investigation/icons/stage-${s.id}.webp`}
                    width={88}
                    height={88}
                    alt=""
                    className={`size-11 shrink-0 object-contain mix-blend-multiply brightness-105 ${current ? "" : "opacity-60"}`}
                  />
                  <span>
                    <span
                      className={`mb-0.5 block text-[10px] uppercase tracking-widest ${current ? "text-primary" : "text-muted"}`}
                    >
                      Stage {String(s.id).padStart(2, "0")}
                    </span>
                    <span className="block text-xs leading-5">{s.label.name}</span>
                  </span>
                </button>
                {current ? (
                  <div className="mb-1 ml-[21px] mt-3 space-y-0.5 border-l border-primary/30 pl-5">
                    {currentInChapter > 2 ? (
                      <button
                        type="button"
                        className="min-h-8 text-[11px] text-muted hover:text-primary"
                        onClick={() => jump(nearby[Math.max(0, currentInChapter - 7)].ep)}
                      >
                        Earlier in this stage ↑
                      </button>
                    ) : null}
                    {stops.map((ep) => (
                      <button
                        key={ep.ep}
                        type="button"
                        aria-current={ep.ep === active ? "location" : undefined}
                        aria-label={`Jump to episode ${ep.ep}`}
                        onClick={() => jump(ep.ep)}
                        className={`relative block min-h-11 w-full rounded-md px-2 py-1.5 text-left motion-safe:transition-colors ${ep.ep === active ? "bg-primary/7 text-primary" : "text-muted hover:bg-primary/5"}`}
                      >
                        <span
                          aria-hidden="true"
                          className={`absolute -left-[24px] top-4 size-[7px] rounded-full border ${ep.ep === active ? "border-primary bg-primary ring-4 ring-bg" : "border-muted/40 bg-bg"}`}
                        />
                        <span className="block text-[10px] tabular-nums">
                          Episode {ep.ep} <span className="text-muted">· {ep.ts_start?.slice(11, 16)}</span>
                        </span>
                        <span className="line-clamp-1 text-[11px] leading-5">{ep.preview.replace(/[*#`]/g, "")}</span>
                      </button>
                    ))}
                    {currentInChapter + 3 < nearby.length ? (
                      <button
                        type="button"
                        className="min-h-8 text-[11px] text-muted hover:text-primary"
                        onClick={() => jump(nearby[Math.min(nearby.length - 1, currentInChapter + 5)].ep)}
                      >
                        Later in this stage ↓
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => jump(episodes[episodes.length - 1].ep)}
            className="ml-3 mt-4 flex min-h-11 items-center gap-3 text-[11px] text-muted hover:text-primary"
          >
            <span aria-hidden="true" className="size-2 rounded-full border border-current" />
            End of the transcript
          </button>
        </nav>
      </aside>
      <section aria-label="Episode reader" className="min-w-0 border-y border-muted/20">
        <div className="flex min-h-14 items-center justify-between gap-4 py-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.16em] text-primary">
              Stage {String(chapter.id).padStart(2, "0")}
            </p>
            <p className="truncate text-xs">{chapter.label.name}</p>
          </div>
          <p className="shrink-0 text-[11px] text-muted">
            <span ref={percent} className="tabular-nums">
              {Math.floor((activeIndex / episodes.length) * 100)}%
            </span>{" "}
            <span className="hidden sm:inline">of the journey</span>
          </p>
        </div>
        <svg
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.floor((activeIndex / episodes.length) * 100)}
          aria-label="Reading progress"
          className="block h-[3px] w-full overflow-hidden bg-muted/10"
          preserveAspectRatio="none"
          viewBox="0 0 100 1"
        >
          <rect
            ref={fill}
            width="100"
            height="1"
            transform={`scale(${activeIndex / episodes.length} 1)`}
            className="origin-left fill-primary motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out"
          />
        </svg>
        <section
          ref={setReader}
          onScroll={onScroll}
          aria-label="Messages"
          // biome-ignore lint/a11y/noNoninteractiveTabindex: The scrollable reader must be keyboard accessible.
          tabIndex={0}
          className="relative h-[65dvh] min-h-96 overflow-y-auto overscroll-contain pr-3 outline-offset-4 lg:h-[calc(100dvh-345px)] lg:min-h-[400px] [scrollbar-gutter:stable]"
        >
          {range.start > 0 ? (
            <LoadBoundary
              root={rootElement}
              onReach={() => {
                if (canLoadEarlier.current) loadMore(true);
              }}
            >
              <button
                type="button"
                className="my-3 min-h-11 w-full text-xs text-muted hover:text-primary"
                onClick={() => loadMore(true)}
              >
                ↑ Read earlier episodes
              </button>
            </LoadBoundary>
          ) : (
            <p className="py-5 text-[11px] text-muted">Beginning of the released transcript</p>
          )}
          {targetId !== null && !episodes.some((ep) => ep.ep === targetId) ? (
            <p role="alert" className="py-5 text-sm text-muted">
              This episode is outside the current results.
            </p>
          ) : null}
          {visible.map((ep, index) => (
            <LazyEpisode
              key={ep.ep}
              episode={ep}
              root={rootElement}
              isOpen={isOpen}
              toggle={toggle}
              chapter={chapterFor(ep.ep, segments)}
              chapterStart={ep.ep === chapterFor(ep.ep, segments).ep_start || (index === 0 && range.start === 0)}
              onReady={restore}
            />
          ))}
          {range.end < episodes.length ? (
            <LoadBoundary root={rootElement} onReach={() => loadMore()}>
              <button type="button" onClick={() => loadMore()} className="min-h-20 w-full text-xs text-muted">
                Continue reading ↓
              </button>
            </LoadBoundary>
          ) : (
            <div className="py-14 text-center">
              <Image
                src="/investigation/icons/stage-10.webp"
                width={88}
                height={88}
                alt=""
                className="mx-auto mb-3 size-14 mix-blend-multiply brightness-105"
              />
              <p className="text-sm">End of the released transcript.</p>
              <p className="mt-1 text-xs text-muted">Every step, in the order it happened.</p>
              <button
                type="button"
                className={`${linkClass} mt-4 min-h-11 text-xs`}
                onClick={() => jump(episodes[0].ep)}
              >
                Return to the beginning ↑
              </button>
            </div>
          )}
        </section>
      </section>
    </div>
  );
}

function LoadBoundary({
  root,
  onReach,
  children,
}: {
  root: HTMLElement | null;
  onReach: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const callback = useRef(onReach);
  useLayoutEffect(() => {
    callback.current = onReach;
  });
  useEffect(() => {
    if (!root || !ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) callback.current();
      },
      { root, rootMargin: "350px 0px" },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [root]);
  return <div ref={ref}>{children}</div>;
}

function LazyEpisode({
  episode: ep,
  chapter,
  chapterStart,
  root,
  isOpen,
  toggle,
  onReady,
}: {
  episode: EpisodePreview;
  chapter: Segment;
  chapterStart: boolean;
  root: HTMLElement | null;
  onReady: (ep: number) => void;
} & DisclosureProps) {
  const row = useRef<HTMLElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const height = useRef(440);
  const [near, setNear] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const ready = useCallback(() => {
    setLoaded(true);
    requestAnimationFrame(() => onReady(ep.ep));
  }, [ep.ep, onReady]);
  useEffect(() => {
    if (!root || !row.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting && content.current) height.current = content.current.getBoundingClientRect().height;
        setNear(entry.isIntersecting);
      },
      { root, rootMargin: "1000px 0px" },
    );
    observer.observe(row.current);
    return () => observer.disconnect();
  }, [root]);
  return (
    <article
      ref={row}
      data-episode={ep.ep}
      data-loaded={loaded && near}
      aria-label={`Episode ${ep.ep}`}
      className="scroll-mt-5 border-b border-muted/15 last:border-0"
    >
      {near ? (
        <div ref={content} className="py-7">
          {chapterStart ? (
            <div className="mb-8 flex items-start gap-4 border-b border-muted/15 pb-6">
              <Image
                src={`/investigation/icons/stage-${chapter.id}.webp`}
                width={112}
                height={112}
                alt=""
                className="size-14 shrink-0 mix-blend-multiply brightness-105"
              />
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-widest text-primary">
                  Stage {String(chapter.id).padStart(2, "0")}
                </p>
                <h2 className="mb-2! text-lg!">{chapter.label.name}</h2>
                <p className="text-xs leading-6 text-muted">
                  {Array.isArray(chapter.label.summary) ? chapter.label.summary[0] : chapter.label.summary}
                </p>
              </div>
            </div>
          ) : null}
          <div className="mb-4 flex items-center gap-3 text-[11px]">
            <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
            <h3 className="font-medium">Episode {ep.ep}</h3>
            <span className="text-muted">{ep.ts_start?.slice(11)}</span>
          </div>
          {ep.groups.length ? (
            <div className="mb-5 flex flex-wrap gap-1.5">
              {ep.groups.map((g) => (
                <TagChip key={g} name={g} />
              ))}
            </div>
          ) : null}
          <EpisodeContent index={ep.ep} isOpen={isOpen} toggle={toggle} onReady={ready} />
        </div>
      ) : (
        <svg aria-hidden="true" width="1" height={height.current} className="block" />
      )}
    </article>
  );
}

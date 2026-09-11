"use client";
import { useEffect, useState } from "react";
import type { Episode } from "@/app/lib/investigation/types";
import { LoadState, linkClass, SourceLink } from "../shared";

export type DisclosureProps = {
  isOpen: (key: string, defaultOpen: boolean) => boolean;
  toggle: (key: string, defaultOpen: boolean) => void;
};
type EpisodeSource = { episode: Episode; messages: { index: number; role: string; content: string }[] };
const cache = new Map<number, EpisodeSource>();
function useEpisode(index: number) {
  const [data, setData] = useState<EpisodeSource | null>(() => {
    const episode = cache.get(index);
    return episode ?? null;
  });
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (cache.has(index)) return;
    const controller = new AbortController();
    setError("");
    fetch(`/api/investigation/episode-messages?index=${index}`, {
      signal: controller.signal,
      cache: attempt ? "reload" : "default",
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("This episode could not be loaded.");
        return r.json();
      })
      .then((result: EpisodeSource) => {
        if (controller.signal.aborted) return;
        cache.set(index, result);
        const oldest = cache.keys().next().value;
        if (cache.size > 32 && oldest !== undefined) cache.delete(oldest);
        setData(result);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => controller.abort();
  }, [index, attempt]);
  return { data, error, retry: () => setAttempt((n) => n + 1) };
}

export function EpisodeContent({
  index,
  isOpen,
  toggle,
  onReady,
}: { index: number; onReady: () => void } & DisclosureProps) {
  const { data, error, retry } = useEpisode(index);
  useEffect(() => {
    if (data?.episode.ep === index) onReady();
  }, [data, index, onReady]);
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
      {data.messages.map((message) => {
        const reasoning = [...message.content.matchAll(/<thinking>([\s\S]*?)<\/thinking>/g)]
          .map((m) => m[1].trim())
          .join("\n\n");
        const visible = message.content.replace(/<thinking>[\s\S]*?<\/thinking>/g, "").trim();
        return (
          <div key={message.index}>
            {data.messages.length > 1 ? (
              <p className="mb-3 text-xs text-muted">
                {message.role} · <SourceLink index={message.index} />
              </p>
            ) : null}
            {reasoning ? (
              <Expandable
                id={`${ep.ep}.thinking`}
                label="Thinking"
                text={reasoning}
                expanded={isOpen(`${ep.ep}.thinking`, expanded)}
                onToggle={() => toggle(`${ep.ep}.thinking`, expanded)}
              />
            ) : null}
            {visible ? (
              <Expandable
                id={`${ep.ep}.visible`}
                label="Message"
                text={visible}
                expanded={isOpen(`${ep.ep}.visible`, expanded)}
                onToggle={() => toggle(`${ep.ep}.visible`, expanded)}
              />
            ) : null}
          </div>
        );
      })}
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
    <div className="mb-6">
      <p className="mb-1 text-[11px] uppercase tracking-wide text-muted">{label}</p>
      <p
        id={`ep-${id}`}
        className={`whitespace-pre-wrap break-words text-[15px] leading-7 [overflow-wrap:anywhere] ${expanded || text.length <= 300 ? "" : "line-clamp-3"}`}
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

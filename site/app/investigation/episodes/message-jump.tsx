"use client";
import { useEffect, useRef, useState } from "react";
import type { EpisodePreview, Message } from "@/app/lib/investigation/types";
import { buttonClass, inputClass, useDataset } from "../shared";
import { useSearchUrl } from "../use-search-url";

export function MessageJump({
  episodes,
  message,
  onJump,
}: {
  episodes: EpisodePreview[];
  message: number | null;
  onJump: (index: number) => void;
}) {
  const { params, update } = useSearchUrl();
  const entry = params.get("entry") ?? (message === null ? "" : `#${message}`);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  // biome-ignore lint/correctness/useExhaustiveDependencies: A changed URL input cancels an obsolete jump request.
  useEffect(() => {
    request.current?.abort();
    setBusy(false);
    setError("");
  }, [entry, message]);
  async function submit() {
    const value = entry.trim().match(/^#?(\d+)$/)?.[1];
    const index = value === undefined ? NaN : Number(value);
    if (!Number.isSafeInteger(index)) {
      setError("Enter a message number, like 1633 or #1633.");
      return;
    }
    if (!episodes.some((ep) => index >= ep.idx_first && index <= ep.idx_last)) {
      setError("This message is not in the released transcript.");
      return;
    }
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/investigation/message?index=${index}`, { signal: controller.signal });
      if (!response.ok) {
        if (response.status === 404) throw new Error("This message is not in the released transcript.");
        throw new Error("Could not load this message. Try again.");
      }
      if (!controller.signal.aborted) onJump(index);
    } catch (failure) {
      if (!controller.signal.aborted)
        setError(failure instanceof Error ? failure.message : "Could not load this message.");
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  return (
    <div className="mb-5">
      <form
        className="flex items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <label className="min-w-0 flex-1 text-xs font-medium">
          Go to message
          <input
            className={`${inputClass} mt-2`}
            type="text"
            placeholder="1633 or #1633"
            maxLength={20}
            value={entry}
            aria-invalid={!!error}
            aria-describedby={error ? "message-jump-error" : undefined}
            onChange={(event) => update({ entry: event.target.value }, { replace: true })}
          />
        </label>
        <button className={`${buttonClass} shrink-0 px-3`} type="submit" disabled={busy}>
          {busy ? "Going…" : "Go →"}
        </button>
      </form>
      {error ? (
        <p id="message-jump-error" role="alert" className="mt-2 text-xs text-primary">
          {error}
        </p>
      ) : null}
      {message !== null ? <MessageNavigation key={message} index={message} onJump={onJump} /> : null}
    </div>
  );
}

function MessageNavigation({ index, onJump }: { index: number; onJump: (index: number) => void }) {
  const { data, error } = useDataset<{ message: Message; previous: number | null; next: number | null }>(
    `message?index=${index}`,
  );
  if (!data) return <output className="mt-2 block text-xs text-muted">{error || `Loading #${index}…`}</output>;
  return (
    <nav aria-label="Adjacent messages" className="mt-2 flex items-center justify-between gap-2 text-xs">
      <button
        type="button"
        disabled={data.previous === null}
        onClick={() => data.previous !== null && onJump(data.previous)}
        className="min-h-11 text-primary disabled:invisible"
        aria-label="Previous message"
      >
        ← #{data.previous}
      </button>
      <span className="text-muted">#{index}</span>
      <button
        type="button"
        disabled={data.next === null}
        onClick={() => data.next !== null && onJump(data.next)}
        className="min-h-11 text-primary disabled:invisible"
        aria-label="Next message"
      >
        #{data.next} →
      </button>
    </nav>
  );
}

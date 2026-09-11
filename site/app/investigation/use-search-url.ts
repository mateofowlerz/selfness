"use client";

import { useMemo, useSyncExternalStore } from "react";

const changeEvent = "investigation-search-url";
function subscribe(callback: () => void) {
  window.addEventListener("popstate", callback);
  window.addEventListener("hashchange", callback);
  window.addEventListener(changeEvent, callback);
  return () => {
    window.removeEventListener("popstate", callback);
    window.removeEventListener("hashchange", callback);
    window.removeEventListener(changeEvent, callback);
  };
}
const getSnapshot = () => window.location.search + window.location.hash;
const getServerSnapshot = () => "";

/** Native history keeps live filtering local while making each view shareable. */
export function useSearchUrl() {
  const location = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [search, hash = ""] = location.split("#");
  const params = useMemo(() => new URLSearchParams(search), [search]);
  function update(
    values: Record<string, string | null>,
    { replace = false, hash: nextHash }: { replace?: boolean; hash?: string } = {},
  ) {
    const url = new URL(window.location.href);
    for (const [key, value] of Object.entries(values)) {
      if (value === null) url.searchParams.delete(key);
      else url.searchParams.set(key, value);
    }
    if (nextHash !== undefined) url.hash = nextHash;
    if (url.href === window.location.href) return;
    // Preserve Next's history metadata so Back/Forward also works across routes.
    window.history[replace ? "replaceState" : "pushState"](window.history.state, "", url);
    window.dispatchEvent(new Event(changeEvent));
  }
  return { params, hash, update };
}

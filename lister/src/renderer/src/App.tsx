import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type Condition,
  type ConnectionStatus,
  type Listing,
  type ListingPhoto,
  type Platform,
  PLATFORMS,
  type PublishResult,
  validateListing,
} from "../../shared/types";
import { ListingForm } from "./components/ListingForm";
import { PhotoDropzone } from "./components/PhotoDropzone";
import { PlatformPanel } from "./components/PlatformPanel";
import { ResultsPanel } from "./components/ResultsPanel";

const EMPTY_LISTING: Listing = {
  title: "",
  description: "",
  price: 0,
  currency: "GBP",
  condition: "very_good" as Condition,
  brand: "",
  size: "",
  color: "",
  category: "",
  tags: [],
  photos: [],
  packageSize: "small",
};

export function App(): React.ReactElement {
  const [listing, setListing] = useState<Listing>(EMPTY_LISTING);
  const [statuses, setStatuses] = useState<ConnectionStatus[]>([]);
  const [selected, setSelected] = useState<Set<Platform>>(new Set());
  const [results, setResults] = useState<PublishResult[] | null>(null);
  const [publishing, setPublishing] = useState(false);

  const refreshStatuses = useCallback(async () => {
    const next = await window.lister.statusAll();
    setStatuses(next);
  }, []);

  useEffect(() => {
    void refreshStatuses();
  }, [refreshStatuses]);

  const updateListing = useCallback((patch: Partial<Listing>) => {
    setListing((prev) => ({ ...prev, ...patch }));
  }, []);

  const setPhotos = useCallback((photos: ListingPhoto[]) => {
    setListing((prev) => ({ ...prev, photos }));
  }, []);

  const toggleSelected = useCallback((platform: Platform) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(platform)) next.delete(platform);
      else next.add(platform);
      return next;
    });
  }, []);

  const connect = useCallback(
    async (platform: Platform) => {
      try {
        await window.lister.connect(platform);
      } catch (err) {
        alert(err instanceof Error ? err.message : String(err));
      } finally {
        await refreshStatuses();
      }
    },
    [refreshStatuses],
  );

  const disconnect = useCallback(
    async (platform: Platform) => {
      await window.lister.disconnect(platform);
      await refreshStatuses();
    },
    [refreshStatuses],
  );

  const selectedList = useMemo(() => PLATFORMS.filter((p) => selected.has(p)), [selected]);

  const validationErrors = useMemo(
    () => validateListing(listing, selectedList),
    [listing, selectedList],
  );

  const connectedSelected = useMemo(
    () => selectedList.filter((p) => statuses.find((s) => s.platform === p)?.connected),
    [selectedList, statuses],
  );

  const canPublish =
    !publishing &&
    connectedSelected.length > 0 &&
    validationErrors.length === 0 &&
    connectedSelected.length === selectedList.length;

  const publish = useCallback(async () => {
    setPublishing(true);
    setResults(null);
    try {
      const res = await window.lister.publish(listing, selectedList);
      setResults(res);
    } catch (err) {
      setResults(selectedList.map((platform) => ({ platform, ok: false, error: String(err) })));
    } finally {
      setPublishing(false);
    }
  }, [listing, selectedList]);

  return (
    <div className="app">
      <header className="app__header">
        <h1>Lister</h1>
        <p>List once. Publish to eBay, Depop and Vinted from your own browser session.</p>
      </header>

      <div className="app__grid">
        <section className="panel">
          <h2 className="panel__title">Photos</h2>
          <PhotoDropzone photos={listing.photos} onChange={setPhotos} />
        </section>

        <section className="panel">
          <h2 className="panel__title">Details</h2>
          <ListingForm listing={listing} onChange={updateListing} />
        </section>

        <aside className="panel app__side">
          <h2 className="panel__title">Marketplaces</h2>
          <div className="platforms">
            {PLATFORMS.map((platform) => (
              <PlatformPanel
                key={platform}
                platform={platform}
                status={statuses.find((s) => s.platform === platform)}
                selected={selected.has(platform)}
                onToggle={() => toggleSelected(platform)}
                onConnect={() => connect(platform)}
                onDisconnect={() => disconnect(platform)}
              />
            ))}
          </div>

          {validationErrors.length > 0 && selectedList.length > 0 && (
            <ul className="errors">
              {validationErrors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}

          <button type="button" className="publish" disabled={!canPublish} onClick={publish}>
            {publishing
              ? "Publishing…"
              : `Publish to ${connectedSelected.length || "—"} marketplace${connectedSelected.length === 1 ? "" : "s"}`}
          </button>
          {selectedList.length > connectedSelected.length && (
            <p className="hint">Connect the selected marketplaces before publishing.</p>
          )}

          {results && <ResultsPanel results={results} />}
        </aside>
      </div>
    </div>
  );
}

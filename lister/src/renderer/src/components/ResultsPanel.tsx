import { ERROR_KIND_LABELS, PLATFORM_LABELS, type PublishResult } from "../../../shared/types";

interface Props {
  results: PublishResult[];
}

export function ResultsPanel({ results }: Props): React.ReactElement {
  // "API changed" is the one failure the user can't fix and we need to know
  // about — surface a distinct banner with a path to the diagnostics log.
  const apiChanged = results.filter((r) => r.errorKind === "api_changed");

  return (
    <div className="results">
      <h3>Results</h3>

      {apiChanged.length > 0 && (
        <div className="drift">
          <strong>A marketplace changed its API.</strong>
          <span>
            {apiChanged.map((r) => PLATFORM_LABELS[r.platform]).join(", ")} responded in a way Lister no longer
            recognises. The adapter needs an update — this isn’t something you can fix by reconnecting.
          </span>
          <button type="button" className="link link--inline" onClick={() => window.lister.openDiagnostics()}>
            Open diagnostics log
          </button>
        </div>
      )}

      <ul>
        {results.map((r) => (
          <li key={r.platform} className={`result${r.ok ? " result--ok" : " result--err"}`}>
            <span className="result__platform">{PLATFORM_LABELS[r.platform]}</span>
            {r.ok ? (
              r.listingUrl ? (
                <a href={r.listingUrl} target="_blank" rel="noreferrer">
                  View listing
                </a>
              ) : (
                <span>Published{r.listingId ? ` (#${r.listingId})` : ""}</span>
              )
            ) : (
              <span className="result__error">
                <span className="result__kind">{ERROR_KIND_LABELS[r.errorKind ?? "unknown"]}</span>
                <span className="result__detail">{r.error}</span>
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

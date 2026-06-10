import { PLATFORM_LABELS, type PublishResult } from "../../../shared/types";

interface Props {
  results: PublishResult[];
}

export function ResultsPanel({ results }: Props): React.ReactElement {
  return (
    <div className="results">
      <h3>Results</h3>
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
              <span className="result__error">{r.error}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

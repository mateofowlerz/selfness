import type { ErrorKind, Platform } from "../../shared/types";
import { logDiagnostic, snippet } from "../storage/diagnostics";

// A failure with a classified cause attached. Adapters throw these; the publish
// layer turns them into PublishResult.errorKind so the UI can react correctly.
export class AdapterError extends Error {
  readonly kind: ErrorKind;
  readonly status?: number;
  constructor(kind: ErrorKind, message: string, status?: number) {
    super(message);
    this.name = "AdapterError";
    this.kind = kind;
    this.status = status;
  }
}

// Maps an HTTP status to a default error kind. 404/410 on an endpoint we expect
// to exist is the strongest signal that the platform moved or removed it.
function kindForStatus(status: number): ErrorKind {
  if (status === 401 || status === 403) return "auth_expired";
  if (status === 404 || status === 410) return "api_changed";
  if (status === 429) return "rate_limited";
  if (status >= 500) return "platform_unavailable";
  return "platform_rejected";
}

interface RequestOptions extends RequestInit {
  platform: Platform;
  // Human label for the endpoint, used in diagnostics, e.g. "createOffer".
  label: string;
  // Treat these otherwise-error statuses as success (e.g. eBay PUT returning 204).
  okStatuses?: number[];
}

export interface ApiResponse {
  status: number;
  text: string;
  // Parsed JSON when the body was JSON; undefined otherwise.
  json?: unknown;
}

// Performs a fetch, classifies any failure into an AdapterError, and logs
// drift-relevant failures to diagnostics. Network failures (fetch rejects) are
// distinguished from HTTP error responses.
export async function request(url: string, opts: RequestOptions): Promise<ApiResponse> {
  const { platform, label, okStatuses = [], ...init } = opts;

  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (err) {
    // fetch only rejects for network-level problems (offline, DNS, TLS, abort).
    const message = err instanceof Error ? err.message : String(err);
    logDiagnostic({ platform, endpoint: label, kind: "network", message });
    throw new AdapterError("network", `${label}: network request failed (${message})`);
  }

  const text = await res.text();
  let json: unknown;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = undefined;
    }
  }

  if (res.ok || okStatuses.includes(res.status)) {
    // A 2xx that should carry JSON but didn't is itself a drift signal; callers
    // assert shape via expectShape below. Here we just return.
    return { status: res.status, text, json };
  }

  const kind = kindForStatus(res.status);
  const message = `${label}: HTTP ${res.status}`;
  // Log everything that isn't a plain auth/rate issue — those are expected and
  // user-actionable. api_changed / rejected / unavailable are what we triage.
  if (kind !== "auth_expired" && kind !== "rate_limited") {
    logDiagnostic({ platform, endpoint: label, kind, message, status: res.status, bodySnippet: snippet(text) });
  }
  throw new AdapterError(kind, `${message} ${snippet(text, 200)}`.trim(), res.status);
}

// Asserts that a successful response matches the shape the adapter depends on.
// If a required field is missing, the platform changed its contract while still
// returning 2xx — the most insidious kind of drift — so we flag api_changed.
export function expectShape<T>(
  resp: ApiResponse,
  platform: Platform,
  label: string,
  check: (json: unknown) => json is T,
): T {
  if (resp.json !== undefined && check(resp.json)) return resp.json;
  logDiagnostic({
    platform,
    endpoint: label,
    kind: "api_changed",
    message: `Response shape did not match expectations (HTTP ${resp.status})`,
    status: resp.status,
    bodySnippet: snippet(resp.text),
  });
  throw new AdapterError(
    "api_changed",
    `${label}: ${platform} returned an unexpected response shape — the adapter needs updating.`,
    resp.status,
  );
}

// Normalizes any thrown value into an AdapterError so adapters never leak an
// unclassified error to the publish layer.
export function toAdapterError(err: unknown, platform: Platform, label: string): AdapterError {
  if (err instanceof AdapterError) return err;
  const message = err instanceof Error ? err.message : String(err);
  logDiagnostic({ platform, endpoint: label, kind: "unknown", message });
  return new AdapterError("unknown", `${label}: ${message}`);
}

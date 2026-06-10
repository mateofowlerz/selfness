import { app } from "electron";
import { appendFileSync, existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Append-only JSONL diagnostics log. Every classified platform failure is
// recorded with the endpoint, status and a response snippet, so when a
// marketplace silently changes its API we can see exactly what came back —
// from our own runs or from a user's bug report. No cookies, tokens or request
// headers are ever written here.

export interface DiagnosticEvent {
  time: string;
  platform: string;
  endpoint: string;
  kind: string;
  message: string;
  status?: number;
  // First bytes of the response body, truncated and stripped of long runs.
  bodySnippet?: string;
}

const MAX_LOG_BYTES = 1024 * 1024; // rotate at 1 MB; diagnostics, not telemetry

export function diagnosticsPath(): string {
  const dir = join(app.getPath("userData"), "lister");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return join(dir, "diagnostics.log");
}

export function logDiagnostic(event: Omit<DiagnosticEvent, "time">): void {
  try {
    const path = diagnosticsPath();
    if (existsSync(path) && statSync(path).size > MAX_LOG_BYTES) {
      writeFileSync(path, "");
    }
    const entry: DiagnosticEvent = { time: new Date().toISOString(), ...event };
    appendFileSync(path, `${JSON.stringify(entry)}\n`, "utf8");
    // Mirror to the console so `pnpm dev` shows drift immediately.
    console.warn(`[diagnostics] ${entry.platform} ${entry.endpoint}: ${entry.kind} — ${entry.message}`);
  } catch (err) {
    console.error("diagnostics: failed to write log", err);
  }
}

export function snippet(body: string, max = 400): string {
  return body.replace(/\s+/g, " ").slice(0, max);
}

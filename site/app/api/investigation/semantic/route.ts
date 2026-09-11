import { readDataset, readVectors } from "@/app/lib/investigation/data";
import { cosineRank } from "@/app/lib/investigation/search";
import type { SemanticHit, SemanticIndex } from "@/app/lib/investigation/types";

export const runtime = "nodejs";
export const maxDuration = 30;
// Bounded warm-instance cache and concurrency. For a public launch, also apply
// a deployment-wide rate limit/budget at the hosting provider (see runbook).
const cache = new Map<string, SemanticHit[]>();
let active = 0;
let windowStart = 0;
let requests = 0;
const reply = (error: string, status: number) =>
  Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== (request.headers.get("host") ?? new URL(request.url).host)) {
        return reply("Use the search form on this website.", 403);
      }
    } catch {
      return reply("Use the search form on this website.", 403);
    }
  }
  if (Number(request.headers.get("content-length")) > 8192) return reply("Query is too long.", 413);
  let body: { query?: unknown; message?: unknown; k?: unknown };
  try {
    const raw = await request.text();
    if (raw.length > 8192) return reply("Query is too long.", 413);
    body = JSON.parse(raw);
    if (!body || typeof body !== "object") return reply("Invalid query.", 400);
  } catch {
    return reply("Invalid query.", 400);
  }
  const fromMessage = body.message !== undefined;
  if (fromMessage && (!Number.isInteger(body.message) || Number(body.message) < 0 || body.query !== undefined))
    return reply("Choose a valid source message.", 400);
  if (!fromMessage && (typeof body.query !== "string" || !body.query.trim() || body.query.length > 1000))
    return reply("Enter a query between 1 and 1,000 characters.", 400);
  const query = typeof body.query === "string" ? body.query.trim() : "";
  const cacheKey = fromMessage ? `message:${body.message}` : `query:${query}`;
  const k = body.k === undefined ? 10 : Number(body.k);
  if (!Number.isInteger(k) || k < 1 || k > 50) return reply("Choose between 1 and 50 results.", 400);
  const key = process.env.OPENAI_API_KEY;
  if (!fromMessage && !key)
    return reply("Text-query search is unavailable. Try finding passages similar to an existing message below.", 503);
  const cached = cache.get(cacheKey);
  if (cached) return Response.json({ results: cached.slice(0, k), model: "text-embedding-3-large" });
  if (Date.now() - windowStart > 60_000) {
    windowStart = Date.now();
    requests = 0;
  }
  if (active >= 2 || requests >= 20) return reply("Search is busy. Please try again in a minute.", 429);
  active++;
  requests++;
  try {
    const [meta, matrix] = await Promise.all([readDataset<SemanticIndex>("semantic"), readVectors()]);
    let vector: number[];
    if (fromMessage) {
      const rows = meta.chunks.flatMap((chunk, i) =>
        chunk.index === body.message && chunk.field === "content" ? [i] : [],
      );
      if (!rows.length) return reply("This message has no indexed text. Choose another message.", 404);
      vector = Array.from(
        { length: meta.dimensions },
        (_, d) => rows.reduce((sum, i) => sum + matrix[i * meta.dimensions + d], 0) / rows.length,
      );
    } else {
      const response = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: meta.model, input: query, encoding_format: "float" }),
        signal: AbortSignal.timeout(20_000),
        cache: "no-store",
      });
      if (!response.ok) {
        const failure = await response.json().catch(() => ({}));
        if (failure.error?.type === "insufficient_quota" || failure.error?.code === "credit_balance_exhausted")
          return reply(
            "Text-query search is temporarily unavailable because the embedding service has no remaining credit. You can still find similar passages from the cached messages below.",
            503,
          );
        return reply("The embedding service is unavailable. Please try again shortly.", 502);
      }
      const result = await response.json();
      vector = result.data?.[0]?.embedding;
      if (!Array.isArray(vector)) return reply("The embedding service returned an invalid response.", 502);
    }
    const results = cosineRank(matrix, vector, meta.dimensions, meta.chunks.length, 50).map(({ index, score }) => ({
      ...meta.chunks[index],
      score: Number(score.toFixed(4)),
    }));
    if (cache.size >= 100) cache.delete(cache.keys().next().value as string);
    cache.set(cacheKey, results);
    return Response.json({ results: results.slice(0, k), chunks: meta.chunks.length, model: meta.model });
  } catch {
    return reply("Search could not finish. Please try again.", 502);
  } finally {
    active--;
  }
}

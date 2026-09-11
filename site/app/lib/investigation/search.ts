import type { Ranked, Scope, SearchData } from "./types";

export function rankSignals(
  data: SearchData,
  scope: Scope,
  selected: string[],
  minimum: number,
  wobble: boolean,
  matchAll = false,
): Ranked[] {
  const wanted = new Set(selected);
  const seen = new Set<number>();
  const results: Ranked[] = [];
  for (const row of data.scopes[scope]) {
    const groups = row.groups.filter((g) => wanted.has(g));
    if (!groups.length || (matchAll && groups.length !== wanted.size)) continue;
    let score = groups.reduce((sum, g) => sum + data.definitions.groups[g].weight, 0);
    for (const [a, b, bonus] of data.definitions.cooccurrence_bonus) {
      if (groups.includes(a) && groups.includes(b)) score += bonus;
    }
    const projection = data.wobble[row.index]?.score ?? null;
    if (score < minimum && !(wobble && projection !== null && projection >= 0.25)) continue;
    const best = Object.keys(row.excerpts)
      .filter((g) => groups.includes(g))
      .sort((a, b) => data.definitions.groups[b].weight - data.definitions.groups[a].weight)[0];
    seen.add(row.index);
    results.push({
      index: row.index,
      score,
      groups,
      excerpt: row.excerpts[best],
      summary: data.summaries[row.index] ?? "",
      wobble: projection,
    });
  }
  // Matches the original additive vector filter; independent of regex scope/tags.
  if (wobble && !matchAll) {
    for (const [id, value] of Object.entries(data.wobble)) {
      if (seen.has(Number(id)) || value.score < 0.25) continue;
      results.push({
        index: Number(id),
        score: 0,
        groups: [],
        excerpt: value.chunk,
        summary: data.summaries[id] ?? "",
        wobble: value.score,
      });
    }
  }
  return results.sort((a, b) => b.score - a.score || (b.wobble ?? 0) - (a.wobble ?? 0) || a.index - b.index);
}

export function cosineRank(matrix: Float32Array, vector: number[], dimensions: number, count: number, k: number) {
  if (vector.length !== dimensions || matrix.length !== dimensions * count || !vector.every(Number.isFinite))
    throw new Error("Invalid embedding dimensions");
  const norm = Math.sqrt(vector.reduce((sum, x) => sum + x * x, 0));
  if (!norm) throw new Error("Empty embedding");
  const query = vector.map((x) => x / norm);
  const scores = Array.from({ length: count }, (_, index) => {
    let score = 0;
    const offset = index * dimensions;
    for (let d = 0; d < dimensions; d++) score += matrix[offset + d] * query[d];
    return { index, score };
  });
  return scores.sort((a, b) => b.score - a.score || a.index - b.index).slice(0, k);
}

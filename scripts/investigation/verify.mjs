import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const root = new URL("../../", import.meta.url);
const require = createRequire(new URL("site/package.json", root));
const ts = require("typescript");
// Only transpile the pure search module. No Next server or paid calls are needed.
const source = readFileSync(new URL("site/app/lib/investigation/search.ts", root), "utf8");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2020 } }).outputText;
const { rankSignals, cosineRank } = await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);
const data = JSON.parse(readFileSync(new URL("site/data/investigation/search.json", root), "utf8"));
const fixture = JSON.parse(readFileSync(process.argv[2], "utf8"));
for (const c of fixture.cases) assert.deepEqual(rankSignals(data, c.scope, c.selected, c.minimum, c.wobble), c.expected, JSON.stringify({ ...c, expected: undefined }));
assert.equal(rankSignals(data, "both", [], 0, false).length, 0);
const pair = ["self_justification_via_intent", "sim_vs_real_deliberation"];
const both = rankSignals(data, "both", pair, 4, false, true);
assert.equal(both.length, 8);
assert.ok(both.every((r) => pair.every((g) => r.groups.includes(g))));
const bytes = readFileSync(new URL("site/data/investigation/vectors.f32", root));
const matrix = new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4);
const meta = JSON.parse(readFileSync(new URL("site/data/investigation/semantic.json", root), "utf8"));
for (const c of fixture.cosines) {
  const actual = cosineRank(matrix, c.vector, meta.dimensions, meta.chunks.length, 50);
  assert.deepEqual(actual.map((r) => r.index), c.expected.map((r) => r.index));
  actual.forEach((r, i) => assert.ok(Math.abs(r.score - c.expected[i].score) < 1e-10));
}
assert.throws(() => cosineRank(matrix, [NaN], meta.dimensions, meta.chunks.length, 10));
console.log(`PASS: ${fixture.cases.length} original Python regex rankings, AND/empty filters, ${fixture.cosines.length} NumPy cosine rankings, invalid vector guard.`);

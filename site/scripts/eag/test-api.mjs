import assert from "node:assert/strict";
import fs from "node:fs/promises";
const base = process.env.EAG_TEST_BASE || "http://localhost:8766";
const secrets = JSON.parse(await fs.readFile(".eag-secrets.local.json", "utf8"));
let checks = 0;
const check = (value, message) => {
  assert.ok(value, message);
  checks++;
};
const request = (url, options = {}) => fetch(base + url, options);
const jsonHeaders = { Origin: base, "Content-Type": "application/json" };
const locked = await request("/eag");
check(locked.ok, "The private entry page renders");
check((locked.headers.get("cache-control") || "").includes("no-store"), "Entry is not cacheable");
const lockedHtml = await locked.text();
check((await request("/eag/api/data")).status === 401, "Guide requires authentication");
check((await request("/eag/api/notes")).status === 401, "Notes require authentication");
check(
  (await request("/eag/api/session", { method: "POST", headers: jsonHeaders, body: JSON.stringify({ key: "wrong" }) }))
    .status === 401,
  "Wrong access key is rejected",
);
check(
  (
    await request("/eag/api/session", {
      method: "POST",
      headers: { ...jsonHeaders, Origin: "https://untrusted.example" },
      body: JSON.stringify({ key: secrets.accessKey }),
    })
  ).status === 403,
  "Cross-origin unlock is rejected",
);
async function session() {
  const response = await request("/eag/api/session", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ key: secrets.accessKey }),
  });
  check(response.ok, "Private unlock works");
  check(response.headers.get("set-cookie").includes("HttpOnly"), "Session is HttpOnly");
  return response.headers.get("set-cookie").split(";")[0];
}
const a = await session(),
  b = await session();
const guideResponse = await request("/eag/api/data", { headers: { Cookie: a } });
check(guideResponse.ok, "Authenticated guide loads");
const guide = await guideResponse.json();
check(guide.meetings.length === 29, "All 29 meetings are preserved");
check(
  guide.meetings.every((m) => !lockedHtml.includes(m.person)),
  "No participant names in locked HTML",
);
check(
  (await request("/eag/api/data", { headers: { Cookie: a.slice(0, -1) + (a.endsWith("a") ? "b" : "a") } })).status ===
    401,
  "Forged sessions are rejected",
);
const slug = guide.meetings[0].brief.slug,
  slug2 = guide.meetings[1].brief.slug;
const original = await request("/eag/api/notes", { headers: { Cookie: a } }).then((r) => r.json());
// Test only the isolated local-development store. Never write QA notes in production.
if (!base.startsWith("http://localhost:") && !base.startsWith("http://127.0.0.1:"))
  throw Error("Writes require a local test server");
const put = (cookie, who, value, version, origin = base) =>
  request("/eag/api/notes", {
    method: "PUT",
    headers: { ...jsonHeaders, Origin: origin, Cookie: cookie },
    body: JSON.stringify({ slug: who, value, baseVersion: version }),
  });
check(
  (await put(a, slug, "wrong origin", null, "https://untrusted.example")).status === 403,
  "Cross-origin writes are rejected",
);
const seed = await put(a, slug, "First device note", original.notes[slug]?.version || null).then((r) => r.json());
const readOnB = await request("/eag/api/notes", { headers: { Cookie: b } }).then((r) => r.json());
check(readOnB.notes[slug].value === "First device note", "A second device sees the saved note");
const changed = await put(b, slug, "Second device note", seed.note.version).then((r) => r.json());
const stale = await put(a, slug, "Stale first-device edit", seed.note.version);
check(stale.status === 409, "Concurrent stale edits are rejected");
check((await stale.json()).current.value === "Second device note", "Conflict includes recoverable current content");
const note2 = await put(a, slug2, "A separate participant note", original.notes[slug2]?.version || null).then((r) =>
  r.json(),
);
const all = await request("/eag/api/notes", { headers: { Cookie: a } }).then((r) => r.json());
check(
  all.notes[slug].value === "Second device note" && all.notes[slug2].value === "A separate participant note",
  "Different participants keep separate notes",
);
check((await put(a, "not-a-real-participant", "x", null)).status === 400, "Unknown participants are rejected");
check((await put(a, slug, "x".repeat(20001), changed.note.version)).status === 400, "Oversized notes are rejected");
await put(a, slug, original.notes[slug]?.value || "", changed.note.version);
await put(a, slug2, original.notes[slug2]?.value || "", note2.note.version);
const logout = await request("/eag/api/session", { method: "DELETE", headers: { Origin: base, Cookie: a } });
check(logout.headers.get("set-cookie").includes("Max-Age=0"), "Lock clears the browser session");
console.log(`Passed ${checks} private-access and two-device sync checks.`);

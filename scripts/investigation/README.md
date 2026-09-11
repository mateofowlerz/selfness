# Anthropic investigation on Selfness

This is an independent copy of the research companion. The original investigation
checkouts and Python servers are never modified or needed at runtime.

## Routes

- `/anthropic-cybersecurity-investigation`: writing, rendered by the existing Markdown pipeline.
- `/investigation/search`: original weighted regex groups, thinking/visible scope,
  additive self-deception vector filter, plus literal excerpt/summary search and AND tags.
- `/investigation/semantic`: query embeddings and cosine ranking over the existing cache.
- `/investigation/episodes`: all 703 episodes and ten Kimi-labelled contiguous stages.
- `/investigation/transcript#m129`: full-message reader, with original numbering,
  neighbor navigation, JSON field provenance, and escaped tool content.

These become relative routes on `mateofowler.com` when this branch is deployed.
No deployment, push, cloud storage upload, or public DNS change is part of this work.

## Runtime and data

`site/data/investigation` contains portable generated JSON and the original normalized
3,839 × 3,072 float32 matrix, converted losslessly from NPZ. The server reads these
files once per warm instance. Next's output-file tracing includes the files in its
function bundles. Nothing relies on Python, NumPy, SQLite, local file URLs, or ports
8137/8138 at runtime. The approximately 45 MiB matrix stays server-side.

The browser fetches the 408 KiB regex index or 1.7 MiB episode dataset only on the
relevant page, renders results in batches, and requests full messages individually.
The source JSONL and publisher notices are hosted at `/investigation/source/`;
readers do not have to download a file to use the tools. The upstream PDF and HTML
remain available from the pinned publisher repository in `SOURCE.json`; they are
not duplicated in this bundle. The styled transcript reader replaces the local HTML.

Source SHA-256, input hashes, output hashes, chunk metadata, and copied methods are
available in `site/public/investigation/source`. Publisher redactions and the
benchmark canary/no-training notice are preserved. Kimi labels and summaries are
explicitly marked as generated interpretation. The release does not contain
messages 1–81 or material after 2145.

## Local preview

From `site`, run `pnpm install --frozen-lockfile` if dependencies are missing, then
`pnpm dev --hostname 127.0.0.1 --port 3047`.

Semantic search requires `INVESTIGATION_OPENAI_API_KEY` in the server environment
or untracked `site/.env.local`. It takes precedence over a shared shell's
`OPENAI_API_KEY`, which remains supported as a fallback. Never use a `NEXT_PUBLIC_`
variable for either key. The code sends only
the visitor's query to OpenAI's embeddings endpoint, with the existing model
`text-embedding-3-large`, and ranks against the copied cache. The text input searches
after typing pauses and always displays ten passages. The API also supports source-message
queries using the normalized mean of that message’s cached content vectors; these need neither an
API key nor an external request. No transcript rebuild
or paid model analysis is required. Official API schema:
https://developers.openai.com/api/reference/resources/embeddings/methods/create

Invalid/empty queries, unavailable credentials, provider failures and timeouts
produce explicit UI errors. The endpoint enforces a 1,000-character query limit,
1–50 results, a bounded warm-instance cache, 20 uncached queries per minute per
instance, and two concurrent uncached queries per instance. These are not global
quotas: before a future public launch, configure a deployment-wide provider budget
and host-level rate limit for `/api/investigation/semantic`.

## Reproduce and verify the copy

The exporter only reads the paths passed to it. It imports the copied Python
ranking implementation, not modules from the original checkout, and disables bytecode
writes. It does not call any network service. It preserves Python regex semantics
and converts highlight offsets to JavaScript UTF-16 coordinates.

```sh
uv run scripts/investigation/export.py \
  --investigation /path/to/investigations \
  --analysis /path/to/investigations-worktrees/misalignment-search
uv run --with numpy scripts/investigation/verify.py --output /tmp/investigation-fixtures.json
node scripts/investigation/verify.mjs /tmp/investigation-fixtures.json
cd site
pnpm exec biome check app/investigation app/lib/investigation app/api/investigation next.config.ts
pnpm exec tsc --noEmit
pnpm build
```

The provider must have available credit for new text-query embeddings. Cached
source-message similarity remains available without credentials.

The verifier compares every released message and generated artifact checksum,
72 ranking combinations against the original Python implementation, five complete
top-50 cosine rankings against NumPy, AND/empty-tag behavior, and invalid vectors.
The copied Python files under `source/` are provenance references; some retain
their original CLI paths and should be used with explicit input paths.

The search tools persist state in the URL. Tag search uses `q`, `groups`, `limit`,
`definitions`, and `#m139` for an open message. Semantic search uses `q`. Episodes
uses `q`, `start`, `limit`, and `#ep2` for the loaded timeline window and current
episode. `at` preserves the reading position within the episode (0–1000), and
`timeline=1` opens the compact chapter navigation. `open` and `closed` preserve
individual disclosures, such as `open=2.tools,2.artifacts&closed=2.thinking`.
Legacy `stage` and `#stage1` links still work. The reader fetches original messages
on demand and releases distant episode content while preserving its space.

Browser QA should cover combined tags, empty results, message and
episode hashes, stage filtering, expanded text/tools/artifacts, a real semantic query, and narrow
mobile layouts. Keep the writing synchronized with the latest Notion snapshot
before committing; Notion is not edited by the import.

For a production HTTP smoke check, start the built server with no API key as shown
in `smoke.py`, then run `python3 scripts/investigation/smoke.py`. It only contacts
localhost and exercises the cached-vector path, not the paid embeddings API.

The writing is imported from Notion's HTML export to preserve rich text.
The current source is the final pasted revision beginning "Independent
investigation of a rogue Claude instance", with the author's newer opening
paragraph and reflection ordering from the first draft reconciled into it.
The approved grammar corrections were applied to both Notion drafts and the
article; optional changes to meaning and narrative style remain unapplied.
Source quotations retain their original wording. Existing transcript links, rose highlights,
and quoted-list structure are preserved after Notion's browser-copy round trip.
Local site URLs remain relative. METR and Kimi-trace placeholders await targets.

The skull-parcel mark was produced with Krea from approved option C. It appears
in the article header and the static 1200x630 social image. The dynamic Open Graph
route uses the same artwork. Other Mythos symbols remain proposals, not deployed.

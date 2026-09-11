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

Semantic search requires `OPENAI_API_KEY` in the server environment (or untracked
`site/.env.local`). Never use a `NEXT_PUBLIC_` variable for it. The code sends only
the visitor's query to OpenAI's embeddings endpoint, with the existing model
`text-embedding-3-large`, and ranks against the copied cache. The source-passage buttons rank against the
normalized mean of that message’s cached content vectors, so they need neither an
API key nor a network request. They do not pretend to embed a new free-text query. No transcript rebuild
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

During local verification the configured key returned `429 / insufficient_quota /
credit_balance_exhausted`. Billing was not modified. Cached passage similarity
works; new text-query embeddings need a funded key before they can succeed.

The verifier compares every released message and generated artifact checksum,
72 ranking combinations against the original Python implementation, five complete
top-50 cosine rankings against NumPy, AND/empty-tag behavior, and invalid vectors.
The copied Python files under `source/` are provenance references; some retain
their original CLI paths and should be used with explicit input paths.

Browser QA should cover combined tags, empty results, scope changes, message and
episode hashes, stage filtering, expanded tools, a real semantic query, and narrow
mobile layouts. Keep the writing synchronized with the latest Notion snapshot
before committing; Notion is not edited by the import.

For a production HTTP smoke check, start the built server with no API key as shown
in `smoke.py`, then run `python3 scripts/investigation/smoke.py`. It only contacts
localhost and exercises the cached-vector path, not the paid embeddings API.

The writing is imported from Notion's HTML export to preserve rich text.
The current source is the final pasted revision beginning "Independent
investigation of rogue Claude instance", rather than the earlier duplicate.
The wording is unchanged; grammar suggestions are kept outside the published
article pending the author's approval. Existing transcript links, rose highlights,
and quoted-list structure are preserved after Notion's browser-copy round trip.
Local site URLs remain relative. METR and Kimi-trace placeholders await targets.

The skull-parcel mark was produced with Krea from approved option C. It appears
in the article header and the static 1200x630 social image. The dynamic Open Graph
route uses the same artwork. Other Mythos symbols remain proposals, not deployed.

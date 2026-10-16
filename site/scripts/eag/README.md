# Private EAG guide

The guide lives at `/eag` as a dynamic route, isolated from the public blog layout and analytics. Its private unlock link exchanges a 256-bit random key from the URL fragment for an HttpOnly, SameSite=Strict, path-scoped session cookie. The fragment is removed immediately. The key is never sent as a URL query. Sessions last 30 days; the Lock button clears this browser's session.

All 29 briefs and schedule details are stored in an AES-256-GCM envelope in `data/eag/guide.enc.json`. The plaintext, data key, unlock key, and local notes are excluded from Git and deployment uploads. Only authenticated requests to `/eag/api/data` can decrypt the guide. HTML and API responses are private/no-store and noindex.

Production notes use a **private Vercel Blob store**, with uncached reads and ETag conditional writes. Note versions reject stale edits from other devices; the interface preserves both versions for an explicit choice. A local draft is saved as you type. Failed saves retry, and drafts recover after reload. Cleared notes keep a version so a stale device cannot resurrect them silently. The UI refreshes from other devices every 15 seconds and on focus/reconnection.

## Local preview

- Run `pnpm run dev:eag` in `site/`; it serves `http://localhost:8766/eag`.
- The separate original guide at `http://127.0.0.1:8765` is kept running.
- `.env.local` sets `EAG_LOCAL_NOTES=1`. This mode persists notes in the ignored `eag-dev-notes.json` and is forcibly disabled on Vercel.
- The private preview bridge at `http://127.0.0.1:8767/` signs the browser into the local guide without printing the access key. It is a separate local helper, not deployed.
- Import local notes opens the original guide's `transfer.html`; import uses a checked window source and exact origin. A JSON-file fallback is also available. Existing non-empty notes are never overwritten silently.

## Validation

`pnpm build` compiles both the public site and the private routes. `node scripts/eag/run-tests.mjs` starts its own production-mode test server on port 8768 and uses a disposable notes file. It checks authentication, cross-origin rejection, private responses, two independent sessions, note isolation, stale-write conflicts, and payload validation. It leaves user notes unchanged. `node scripts/eag/check-privacy.mjs` checks source, route traces and public assets for private notes, participant names, meeting IDs and generated secrets.

Browser QA also covers editing, reload, switching participants, a simulated sync outage and recovery, and the mobile layout.

## Pending deployment

Deployment was deferred at the user's request while the Mac had no IPv4 route. Nothing in this branch has been pushed or published to mateofowler.com.

When deployment is resumed:

1. Fetch current `origin/master` and reconcile any newer Selfness changes.
2. Inspect the existing Vercel project `selfness` in scope `mateo-sirvanacoms-projects` and its storage/environment names. Preserve the public site's settings and existing private writing.
3. Create/connect a dedicated **private** Blob store for EAG notes. Use production only; do not point local QA at live notes. Prefer Vercel OIDC when available; otherwise the server SDK reads `BLOB_READ_WRITE_TOKEN`.
4. Set production `EAG_ACCESS_KEY_SHA256`, `EAG_SESSION_SECRET`, and `EAG_DATA_KEY` from the local secret material through stdin, never CLI arguments or logs. Do not set `EAG_LOCAL_NOTES` in production.
5. Build, run the isolated tests, scan source/public bundles for plaintext/secrets, and publish the reviewed commit using the existing Selfness deployment flow.
6. Verify `/eag` remains locked without the private link, authenticate normally, test real Blob persistence across independent sessions, and migrate existing browser notes. Deliver the private unlock link securely to the user. The plain `/eag` URL works after unlocking on that device.

Current implementation pins `xdg-app-paths` to cached version 5.1.0 because dependency installation was offline. Remove that temporary override and resolve the normal dependency tree once network access returns, then rebuild.

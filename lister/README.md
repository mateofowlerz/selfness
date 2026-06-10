# Lister

A desktop app to list a product once and publish it to **eBay**, **Depop** and
**Vinted**. Built with Electron + React + TypeScript.

## Why a desktop app

The three marketplaces differ in how they let third parties create listings:

| Platform | How Lister connects | Notes |
| --- | --- | --- |
| eBay   | Official OAuth + Inventory API | Standard developer program, no password handling. |
| Depop  | Official Selling API *(if you have partner access)*, otherwise interactive sign-in | Public API is partner-only. |
| Vinted | Interactive sign-in (session capture) | No public listing API for ordinary sellers. |

For Depop and Vinted, listings are created **through the user's own logged-in
browser session** inside the app. The user signs in normally — clearing any 2FA
or captcha themselves — and Lister reuses that authenticated session. Requests
originate from the user's real session, fingerprint and home IP, which a
server-side webapp cannot replicate without storing passwords and fighting
anti-bot systems. That is the core reason this is Electron rather than a webapp.

Passwords are never collected or stored. Sessions and the eBay OAuth tokens are
kept encrypted on disk via Electron `safeStorage` (OS keychain).

## Architecture

```
src/
  shared/          Canonical Listing schema, IPC channel names (main <-> renderer)
  main/            Electron main process
    index.ts       Window + IPC handlers
    storage/       Encrypted key/value store (safeStorage)
    platforms/
      types.ts     PlatformAdapter interface
      mapping.ts   Canonical -> per-platform taxonomy (condition, category, ...)
      ebay.ts      OAuth + Inventory API
      vinted.ts    Session-capture upload
      depop.ts     Partner API or session-capture
      sessionLogin.ts  Shared embedded-login / cookie-reuse helper
  preload/         Typed contextBridge API
  renderer/        React UI (drag-drop photos, unified form, publish)
```

A single canonical `Listing` is mapped onto each marketplace by its adapter.
Adding a marketplace means implementing one `PlatformAdapter`.

## Setup

```bash
pnpm install
cp .env.example .env   # fill in eBay credentials (Depop/Vinted optional)
pnpm dev               # run the app
pnpm typecheck         # type-check main + renderer
pnpm build             # production build
pnpm package           # build distributable via electron-builder
```

## Integration seams

Some live calls require real accounts and finalized endpoint details. These are
marked in the adapters:

- **eBay** requires hosted image URLs (not raw uploads) and selling-policy IDs —
  set the policy IDs in `.env` and host photos via eBay's media API.
- **Category & size resolution** (`mapping.ts`) currently falls back to account
  defaults; production resolves free-form text against each platform's
  category/size lookup endpoints.
- **Depop/Vinted endpoint shapes** follow each platform's current internal/
  partner API and may need updating as those change.

## Status

This is a working foundation: the UI, IPC, encrypted storage, OAuth flow,
session capture, and the canonical→platform mapping are all in place. The
marketplace API calls are wired with the seams above to plug in live
credentials.

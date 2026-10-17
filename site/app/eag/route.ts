import { privateHeaders } from "./lib/security";
import { shell } from "./lib/template";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  // Deliberately bypass the public blog layout, analytics and metadata.
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><title>EAG · Mateo Fowler</title><link rel="preload" href="/fonts/PublicSans[wght].ttf" as="font" type="font/ttf" crossorigin><link rel="stylesheet" href="/eag/styles.css"><script src="/eag/app.js" defer></script></head><body class="bg-bg text-fg font-sans leading-[1.7] antialiased [&_button]:cursor-pointer [&_button]:touch-manipulation [&_a]:touch-manipulation [&_:focus-visible]:outline-2 [&_:focus-visible]:outline-offset-4 [&_:focus-visible]:outline-fg/60"><div id="locked" class="mx-auto max-w-[640px] px-4 sm:px-8 pt-8 pb-16"><a href="/" class="font-semibold text-base">Mateo Fowler</a><h1 class="text-[32px] font-medium tracking-[-0.02em] mt-16 mb-4">Your meeting guide</h1><p class="text-base mb-8 text-muted">Open your private unlock link to see your meetings and synced notes.</p><form id="unlock-form"><label for="unlock-key" class="block text-sm font-semibold mb-2">Private unlock link</label><input id="unlock-key" type="password" autocomplete="off" class="w-full min-h-11 bg-white/50 border border-fg/15 rounded px-3 text-base" required><button class="mt-4 min-h-11 px-5 bg-primary-dark hover:bg-primary-darker transition-colors text-white rounded text-sm">Unlock</button></form><p id="unlock-status" class="text-sm text-muted mt-4" role="status">Loading…</p></div><div id="guide" hidden>${shell}</div><input id="notes-file" type="file" accept="application/json,.json" hidden></body></html>`,
    {
      headers: {
        ...privateHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "Content-Security-Policy":
          "default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
        "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
      },
    },
  );
}

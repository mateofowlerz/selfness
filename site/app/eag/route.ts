import { privateHeaders } from "./lib/security";
import { shell } from "./lib/template";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  // Deliberately bypass the public blog layout, analytics and metadata.
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><title>EAG · Mateo Fowler</title><link rel="stylesheet" href="/eag/styles.css"><script src="/eag/app.js" defer></script></head><body class="bg-[#f5f3eb] text-[#253a32] font-sans antialiased [&_button]:cursor-pointer [&_button]:touch-manipulation [&_a]:touch-manipulation [&_:focus-visible]:outline-2 [&_:focus-visible]:outline-offset-4 [&_:focus-visible]:outline-[#b87543]"><div id="locked" class="mx-auto max-w-md px-6 py-24"><a href="/" class="text-sm underline">Mateo Fowler</a><h1 class="font-serif text-4xl mt-8 mb-4">Your meeting guide.</h1><p class="text-sm leading-6 mb-6">Open your private unlock link to see your meetings and synced notes.</p><form id="unlock-form"><label for="unlock-key" class="block text-xs mb-2">Private unlock link</label><input id="unlock-key" type="password" autocomplete="off" class="w-full min-h-11 bg-white border border-[#dedfd3] rounded-md px-3 text-base" required><button class="mt-3 min-h-11 px-5 bg-[#253a32] text-white rounded-md text-sm">Unlock</button></form><p id="unlock-status" class="text-sm mt-4" role="status">Loading…</p></div><div id="guide" hidden>${shell}</div><input id="notes-file" type="file" accept="application/json,.json" hidden></body></html>`,
    {
      headers: {
        ...privateHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "Content-Security-Policy":
          "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
        "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
      },
    },
  );
}

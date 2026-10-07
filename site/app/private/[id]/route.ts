import { createDecipheriv, type ScryptOptions, scrypt } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function deriveKey(password: string, salt: Buffer, length: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, length, options, (error, key) => (error ? reject(error) : resolve(key)));
  });
}
const headers = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "private, no-store, max-age=0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet, noimageindex",
  "Referrer-Policy": "same-origin",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Content-Security-Policy":
    "default-src 'none'; style-src 'self'; font-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

type Envelope = { id: string; salt: string; pepper: string; iv: string; tag: string; ciphertext: string };
type Context = { params: Promise<{ id: string }> };

function envelope(id: string): Envelope | null {
  try {
    const value: Envelope = JSON.parse(process.env.PRIVATE_WRITING_V1 ?? "null");
    if (!value || !/^[a-f0-9]{32}$/.test(id) || value.id !== id) return null;
    if (
      ![value.salt, value.pepper, value.iv, value.tag, value.ciphertext].every(
        (part) => typeof part === "string" && part.length > 0,
      )
    )
      return null;
    return value;
  } catch {
    return null;
  }
}

function document(body: string, status = 200) {
  // A route handler deliberately bypasses the public React layout, analytics,
  // hydration, metadata generation and RSC serialization. Never log its body.
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive,nosnippet"><title>Private writing — Mateo Fowler</title><link rel="stylesheet" href="/private-post.css"></head><body><div class="max-w-[640px] mx-auto px-4 sm:px-8"><header class="pt-8"><a href="/" class="font-semibold no-underline">Mateo Fowler</a></header><main>${body}</main></div></body></html>`,
    { status, headers },
  );
}

function locked(id: string, failed = false) {
  return document(
    `<h1>Private writing</h1><p class="mb-6 text-muted">Enter the password to read this post.</p><form method="post" action="/private/${id}" class="max-w-sm"><label for="password" class="block mb-2">Password</label><input id="password" name="password" type="password" required maxlength="128" autocomplete="current-password" class="block w-full min-h-11 border border-muted rounded-lg px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" ${failed ? 'aria-invalid="true" aria-describedby="error"' : ""}><p id="error" role="status" class="min-h-8 pt-2 text-sm text-primary">${failed ? "Incorrect password. Please try again." : ""}</p><button type="submit" class="min-h-11 mt-2 rounded-lg bg-fg text-bg px-5 py-2 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Read post</button></form>`,
    failed ? 401 : 200,
  );
}

export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;
  return envelope(id) ? locked(id) : document("<h1>Not found</h1>", 404);
}

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  const value = envelope(id);
  if (!value) return document("<h1>Not found</h1>", 404);
  const origin = new URL(request.url);
  // Next's local Node server may use localhost in request.url even when the
  // browser connects through 127.0.0.1. Host is the browser's request authority.
  origin.host = request.headers.get("host") ?? origin.host;
  if (process.env.VERCEL) origin.protocol = "https:";
  if (
    request.headers.get("origin") !== origin.origin ||
    !request.headers.get("content-type")?.startsWith("application/x-www-form-urlencoded")
  ) {
    return document("<h1>Request not allowed</h1>", 403);
  }
  // Bound the actual stream, not just the client-supplied Content-Length.
  const reader = request.body?.getReader();
  if (!reader) return locked(id, true);
  let raw = "";
  let bytes = 0;
  const decoder = new TextDecoder();
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    bytes += chunk.value.byteLength;
    if (bytes > 1024) {
      await reader.cancel();
      return document("<h1>Request too large</h1>", 413);
    }
    raw += decoder.decode(chunk.value, { stream: true });
  }
  raw += decoder.decode();
  const password = new URLSearchParams(raw).get("password");
  if (!password || password.length > 128) return locked(id, true);
  try {
    // The random pepper and encrypted payload live only in a production secret.
    // There is no password, verifier, title or article in source or static assets.
    const key = (await deriveKey(password + value.pepper, Buffer.from(value.salt, "base64"), 32, {
      N: 131072,
      r: 8,
      p: 1,
      maxmem: 256 * 1024 * 1024,
    })) as Buffer;
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(value.iv, "base64"));
    decipher.setAAD(Buffer.from(value.id));
    decipher.setAuthTag(Buffer.from(value.tag, "base64"));
    let article: string;
    try {
      article = Buffer.concat([decipher.update(Buffer.from(value.ciphertext, "base64")), decipher.final()]).toString(
        "utf8",
      );
    } finally {
      key.fill(0);
    }
    return document(
      `<a href="/private/${id}" class="inline-block mb-6 text-sm text-muted underline">Lock post</a><article class="[&_p]:mb-6 [&_ul]:mb-6 [&_ul]:list-disc [&_ul]:pl-6 [&_ul_ul]:mb-0 [&_ul_ul]:list-[circle] [&_li]:mb-1 [&_a]:text-primary [&_a]:underline [&_blockquote]:mb-6 [&_blockquote]:border-l-2 [&_blockquote]:border-muted [&_blockquote]:pl-4">${article}</article>`,
    );
  } catch {
    return locked(id, true);
  }
}

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};
const cookieName = "eag_session";
const lifetime = 60 * 60 * 24 * 30;
const equal = (a: string, b: string) => {
  const first = Buffer.from(a),
    second = Buffer.from(b);
  return first.length === second.length && timingSafeEqual(first, second);
};
export function keyMatches(key: unknown) {
  const expected = process.env.EAG_ACCESS_KEY_SHA256;
  return (
    typeof key === "string" &&
    /^[A-Za-z0-9_-]{43}$/.test(key) &&
    !!expected &&
    equal(createHash("sha256").update(key).digest("hex"), expected)
  );
}
function signature(payload: string) {
  const secret = process.env.EAG_SESSION_SECRET;
  if (!secret || secret.length < 43) throw new Error("EAG session is not configured");
  return createHmac("sha256", secret).update(payload).digest("base64url");
}
export function sessionCookie() {
  const expires = String(Math.floor(Date.now() / 1000) + lifetime);
  return `${cookieName}=${expires}.${signature(expires)}; HttpOnly; Path=/private/eag; SameSite=Strict; Max-Age=${lifetime}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
}
export function clearSessionCookie() {
  return `${cookieName}=; HttpOnly; Path=/private/eag; SameSite=Strict; Max-Age=0${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
}
export function authenticated(request: Request) {
  try {
    const cookie = request.headers
      .get("cookie")
      ?.split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith(`${cookieName}=`))
      ?.slice(cookieName.length + 1);
    if (!cookie) return false;
    const [expires, signed, extra] = cookie.split(".");
    return (
      !extra &&
      /^\d{10}$/.test(expires) &&
      Number(expires) > Date.now() / 1000 &&
      Number(expires) <= Date.now() / 1000 + lifetime + 60 &&
      equal(signature(expires), signed || "")
    );
  } catch {
    return false;
  }
}
export function sameOrigin(request: Request) {
  const expected = new URL(request.url);
  expected.host = request.headers.get("host") || expected.host;
  if (process.env.VERCEL) expected.protocol = "https:";
  return request.headers.get("origin") === expected.origin;
}
export function json(value: unknown, status = 200, extra: Record<string, string> = {}) {
  return Response.json(value, { status, headers: { ...privateHeaders, ...extra } });
}
export async function body(request: Request, limit = 64_000): Promise<Record<string, unknown>> {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new Error("content-type");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("body");
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const chunk = await reader.read();
    if (chunk.done) break;
    total += chunk.value.byteLength;
    if (total > limit) {
      await reader.cancel();
      throw new Error("size");
    }
    chunks.push(chunk.value);
  }
  const result: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  if (!result || typeof result !== "object" || Array.isArray(result)) throw new Error("shape");
  return result as Record<string, unknown>;
}

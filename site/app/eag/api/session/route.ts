import { body, clearSessionCookie, json, keyMatches, sameOrigin, sessionCookie } from "../../lib/security";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: "Request not allowed" }, 403);
  try {
    const { key } = await body(request, 1024);
    if (!keyMatches(key)) return json({ error: "This unlock link is not valid." }, 401);
    return json({ ok: true }, 200, { "Set-Cookie": sessionCookie() });
  } catch {
    return json({ error: "Unable to unlock this page." }, 400);
  }
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return json({ error: "Request not allowed" }, 403);
  return json({ ok: true }, 200, { "Set-Cookie": clearSessionCookie() });
}

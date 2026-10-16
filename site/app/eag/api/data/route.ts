import { guide } from "../../lib/guide";
import { authenticated, json } from "../../lib/security";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  if (!authenticated(request)) return json({ error: "Unlock required" }, 401);
  try {
    return json(await guide());
  } catch {
    return json({ error: "The meeting guide is temporarily unavailable." }, 503);
  }
}

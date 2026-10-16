import { authenticated, body, json, sameOrigin } from "../../lib/security";
import { validPerson } from "../../lib/guide";
import { NoteConflict, readNotes, saveNote } from "../../lib/notes";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  if (!authenticated(request)) return json({ error: "Unlock required" }, 401);
  try {
    return json({ notes: await readNotes() });
  } catch {
    return json({ error: "Sync is unavailable. Your local notes are safe." }, 503);
  }
}
export async function PUT(request: Request) {
  if (!authenticated(request)) return json({ error: "Unlock required" }, 401);
  if (!sameOrigin(request)) return json({ error: "Request not allowed" }, 403);
  try {
    const { slug, value, baseVersion } = await body(request);
    if (
      !(await validPerson(slug)) ||
      typeof value !== "string" ||
      value.length > 20_000 ||
      !(baseVersion === null || (typeof baseVersion === "string" && /^[a-f0-9-]{36}$/.test(baseVersion)))
    ) {
      return json({ error: "Invalid note" }, 400);
    }
    return json({ note: await saveNote(slug as string, value, baseVersion as string | null) });
  } catch (error) {
    if (error instanceof NoteConflict) return json({ error: error.message, current: error.current }, 409);
    return json({ error: "Could not sync this note. Your local copy is kept." }, 503);
  }
}

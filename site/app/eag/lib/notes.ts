import { get, put, BlobPreconditionFailedError } from "@vercel/blob";
import { randomUUID } from "node:crypto";
import { readFile, writeFile, rename, mkdir } from "node:fs/promises";
import path from "node:path";

export type Note = { value: string; version: string; updatedAt: string };
export type Notes = Record<string, Note>;
const pathname = "eag-2026/notes.json";
let localQueue: Promise<unknown> = Promise.resolve();
const localMode = () => !process.env.VERCEL && process.env.EAG_LOCAL_NOTES === "1";
const localPath = () =>
  process.env.EAG_LOCAL_NOTES_FILE_NAME
    ? path.join(process.cwd(), ".eag-local", path.basename(process.env.EAG_LOCAL_NOTES_FILE_NAME))
    : path.join(process.cwd(), "eag-dev-notes.json");

async function load(): Promise<{ notes: Notes; etag: string | null }> {
  if (localMode()) {
    try {
      return { notes: JSON.parse(await readFile(localPath(), "utf8")), etag: null };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return { notes: {}, etag: null };
      throw error;
    }
  }
  const result = await get(pathname, { access: "private", useCache: false });
  if (!result) return { notes: {}, etag: null };
  if (result.statusCode !== 200 || !result.stream) throw new Error("Unable to read current notes");
  return { notes: await new Response(result.stream).json(), etag: result.blob.etag };
}
export async function readNotes() {
  return (await load()).notes;
}
export class NoteConflict extends Error {
  constructor(public current: Note | null) {
    super("This note changed on another device");
  }
}
async function update(slug: string, value: string, baseVersion: string | null): Promise<Note> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const { notes, etag } = await load();
    const current = notes[slug] || null;
    // A retry after a lost response must not create a spurious conflict.
    if (current && current.value === value) return current;
    if ((current?.version || null) !== baseVersion) throw new NoteConflict(current);
    const next = { value, version: randomUUID(), updatedAt: new Date().toISOString() };
    notes[slug] = next;
    if (localMode()) {
      await mkdir(path.dirname(localPath()), { recursive: true, mode: 0o700 });
      const temp = `${localPath()}.${randomUUID()}.tmp`;
      await writeFile(temp, JSON.stringify(notes), { mode: 0o600 });
      await rename(temp, localPath());
      return next;
    }
    try {
      await put(pathname, JSON.stringify(notes), {
        access: "private",
        addRandomSuffix: false,
        contentType: "application/json",
        cacheControlMaxAge: 60,
        allowOverwrite: !!etag,
        ...(etag ? { ifMatch: etag } : {}),
      });
      return next;
    } catch (error) {
      // A competing save to another person can be merged by rereading the file.
      if (error instanceof BlobPreconditionFailedError || (!etag && /already exists/i.test(String(error)))) continue;
      throw error;
    }
  }
  throw new Error("Notes are busy. Try again shortly.");
}
export async function saveNote(slug: string, value: string, baseVersion: string | null) {
  if (!localMode()) return update(slug, value, baseVersion);
  const job = localQueue.then(() => update(slug, value, baseVersion));
  localQueue = job.catch(() => {});
  return job;
}

import assert from "node:assert/strict";
import { beforeEach, mock, test } from "node:test";

// Exercise the production storage path. The local-file API suite cannot catch
// compression changing the GET ETag into a weak validator rejected by PUT.
process.env.EAG_LOCAL_NOTES = "0";
let stored;
let revision;
let puts;
let beforePut;
const etag = () => `"revision-${revision}"`;
class BlobPreconditionFailedError extends Error {}
mock.module("@vercel/blob", {
  namedExports: {
    BlobPreconditionFailedError,
    get: async (_pathname, options) => {
      const strong = options.headers?.["Accept-Encoding"] === "identity";
      return {
        statusCode: 200,
        stream: new Response(JSON.stringify(stored)).body,
        blob: { etag: strong ? etag() : `W/${etag()}` },
      };
    },
    put: async (_pathname, content, options) => {
      puts++;
      beforePut?.();
      beforePut = undefined;
      if (options.ifMatch !== etag()) throw new BlobPreconditionFailedError("ETag mismatch");
      stored = JSON.parse(content);
      revision++;
      return { etag: etag() };
    },
  },
});
const { saveNote, NoteConflict } = await import("../../app/eag/lib/notes.ts");
const initial = { value: "Existing note", version: "original-version", updatedAt: "2026-10-17T12:00:00Z" };
beforeEach(() => {
  stored = { "person-a": { ...initial } };
  revision = 1;
  puts = 0;
  beforePut = undefined;
});

test("updates a blob when compressed reads would have returned a weak ETag", async () => {
  const value = "A longer meeting note. ".repeat(80);
  const saved = await saveNote("person-a", value, initial.version);
  assert.equal(stored["person-a"].value, value);
  assert.equal(saved.version, stored["person-a"].version);
  assert.equal(puts, 1);
});

test("retries a concurrent update to a different participant without losing it", async () => {
  beforePut = () => {
    stored["person-b"] = { ...initial, value: "Another device's note" };
    revision++;
  };
  await saveNote("person-a", "My new note", initial.version);
  assert.equal(stored["person-a"].value, "My new note");
  assert.equal(stored["person-b"].value, "Another device's note");
  assert.equal(puts, 2);
});

test("rejects a concurrent edit to the same participant and preserves its contents", async () => {
  beforePut = () => {
    stored["person-a"] = { ...initial, value: "Other device edit", version: "new-version" };
    revision++;
  };
  await assert.rejects(saveNote("person-a", "Stale edit", initial.version), (error) => {
    assert.ok(error instanceof NoteConflict);
    assert.equal(error.current.value, "Other device edit");
    return true;
  });
  assert.equal(stored["person-a"].value, "Other device edit");
});

test("a retry after a lost response returns the existing note without rewriting it", async () => {
  const saved = await saveNote("person-a", initial.value, "stale-version");
  assert.deepEqual(saved, initial);
  assert.equal(puts, 0);
});

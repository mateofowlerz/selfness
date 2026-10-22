import { createDecipheriv } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

type Guide = { meetings: Array<{ brief: { slug: string }; [key: string]: unknown }>; [key: string]: unknown };
let cached: Guide | undefined;
export async function guide(): Promise<Guide> {
  if (cached) return cached;
  const key = Buffer.from(process.env.EAG_DATA_KEY || "", "base64url");
  if (key.length !== 32) throw new Error("EAG data is not configured");
  const envelope = JSON.parse(await readFile(path.join(process.cwd(), "data/eag/guide.enc.json"), "utf8"));
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(envelope.iv, "base64"));
  decipher.setAAD(Buffer.from("selfness-eag-guide-v1"));
  decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
  cached = JSON.parse(
    Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext, "base64")), decipher.final()]).toString("utf8"),
  ) as Guide;
  return cached;
}
export async function validPerson(slug: unknown): Promise<boolean> {
  return typeof slug === "string" && (await guide()).meetings.some((meeting) => meeting.brief.slug === slug);
}

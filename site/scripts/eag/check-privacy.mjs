import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createDecipheriv } from "node:crypto";
const secrets = JSON.parse(fs.readFileSync(".eag-secrets.local.json", "utf8"));
const envelope = JSON.parse(fs.readFileSync("data/eag/guide.enc.json", "utf8"));
const decrypt = createDecipheriv(
  "aes-256-gcm",
  Buffer.from(secrets.dataKey, "base64url"),
  Buffer.from(envelope.iv, "base64"),
);
decrypt.setAAD(Buffer.from("selfness-eag-guide-v1"));
decrypt.setAuthTag(Buffer.from(envelope.tag, "base64"));
const guide = JSON.parse(
  Buffer.concat([decrypt.update(Buffer.from(envelope.ciphertext, "base64")), decrypt.final()]).toString("utf8"),
);
function walk(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => (entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]));
}
const source = execFileSync("git", [
  "ls-files",
  "--cached",
  "--others",
  "--exclude-standard",
  "-z",
  "app/private/eag",
  "public/private/eag",
  "scripts/eag",
  "data/eag",
])
  .toString()
  .split("\0")
  .filter(Boolean);
for (const file of source) {
  const text = fs.readFileSync(file, "utf8");
  for (const value of Object.values(secrets))
    if (text.includes(value)) throw Error("Secret appears in source: " + file);
}
const traces = walk(".next/server/app/eag").filter((file) => file.endsWith(".nft.json"));
for (const trace of traces) {
  const files = JSON.parse(fs.readFileSync(trace, "utf8")).files;
  if (files.some((file) => /\.env(?:\.|$)|\.eag-secrets|eag-dev-notes|\.eag-local/.test(file)))
    throw Error("Local secrets or notes appear in route trace: " + trace);
}
const assets = [...walk(".next/static"), ...walk("public/eag")];
const privateValues = [
  ...Object.values(secrets),
  ...guide.meetings.map((meeting) => meeting.person),
  ...guide.meetings.map((meeting) => meeting.meeting_id),
];
for (const file of assets) {
  const contents = fs.readFileSync(file);
  for (const value of privateValues.filter(Boolean))
    if (contents.includes(Buffer.from(value))) throw Error("Private guide data appears in public asset: " + file);
}
console.log(
  `Privacy scan passed: ${source.length} source files, ${traces.length} route traces, and ${assets.length} public assets.`,
);

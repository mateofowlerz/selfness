import { randomBytes, createCipheriv, createHash } from "node:crypto";
import fs from "node:fs/promises";
import vm from "node:vm";
import path from "node:path";
// Run once with an absolute data.js path. Secrets never enter command arguments or output.
const input = process.argv[2];
if (!input || !path.isAbsolute(input)) throw new Error("An absolute source data.js path is required");
const context = { window: {} };
vm.runInNewContext(await fs.readFile(input, "utf8"), context, { timeout: 1000 });
const data = context.window.MEETING_DATA;
if (!Array.isArray(data?.meetings) || !data.meetings.length) throw new Error("Missing guide");
const envPath = ".env.local";
let config;
try {
  config = JSON.parse(await fs.readFile(".eag-secrets.local.json", "utf8"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
  config = {
    accessKey: randomBytes(32).toString("base64url"),
    dataKey: randomBytes(32).toString("base64url"),
    sessionSecret: randomBytes(32).toString("base64url"),
  };
  await fs.writeFile(".eag-secrets.local.json", JSON.stringify(config), { mode: 0o600, flag: "wx" });
}
const iv = randomBytes(12);
const cipher = createCipheriv("aes-256-gcm", Buffer.from(config.dataKey, "base64url"), iv);
cipher.setAAD(Buffer.from("selfness-eag-guide-v1"));
const ciphertext = Buffer.concat([cipher.update(JSON.stringify(data)), cipher.final()]);
await fs.writeFile(
  "data/eag/guide.enc.json",
  JSON.stringify({
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  }),
);
await fs.writeFile(
  envPath,
  [
    `EAG_ACCESS_KEY_SHA256=${createHash("sha256").update(config.accessKey).digest("hex")}`,
    `EAG_SESSION_SECRET=${config.sessionSecret}`,
    `EAG_DATA_KEY=${config.dataKey}`,
    "EAG_LOCAL_NOTES=1",
  ].join("\n") + "\n",
  { mode: 0o600 },
);
console.log(`Encrypted ${data.meetings.length} meeting briefs. Local secrets are ignored by Git.`);

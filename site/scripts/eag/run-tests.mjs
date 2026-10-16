import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
const config = JSON.parse(await fs.readFile(".eag-secrets.local.json", "utf8"));
const testName = `test-${randomUUID()}.json`;
const temporary = path.join(process.cwd(), ".eag-local", testName);
const base = "http://127.0.0.1:8768";
const server = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "-p", "8768"],
  {
    env: {
      ...process.env,
      EAG_ACCESS_KEY_SHA256: createHash("sha256").update(config.accessKey).digest("hex"),
      EAG_SESSION_SECRET: config.sessionSecret,
      EAG_DATA_KEY: config.dataKey,
      EAG_LOCAL_NOTES: "1",
      EAG_LOCAL_NOTES_FILE_NAME: testName,
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let log = "";
server.stdout.on("data", (chunk) => {
  log += chunk;
});
server.stderr.on("data", (chunk) => {
  log += chunk;
});
try {
  let ready = false;
  for (let i = 0; i < 80; i++) {
    try {
      if ((await fetch(base + "/eag")).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  if (!ready) throw Error("Isolated test server did not start: " + log.slice(-2000));
  const test = spawn(process.execPath, ["scripts/eag/test-api.mjs"], {
    env: { ...process.env, EAG_TEST_BASE: base },
    stdio: "inherit",
  });
  const code = await new Promise((resolve) => test.once("exit", resolve));
  if (code !== 0) process.exitCode = 1;
} finally {
  server.kill("SIGTERM");
  await fs.rm(temporary, { force: true });
}

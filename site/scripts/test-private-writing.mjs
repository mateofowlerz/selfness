import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createCipheriv, randomBytes, scryptSync } from "node:crypto";
import { once } from "node:events";
import { setTimeout } from "node:timers/promises";

// Run after `pnpm build`. Synthetic content only; never loads production secrets.
const id = randomBytes(16).toString("hex");
const password = randomBytes(24).toString("base64");
const salt = randomBytes(32);
const pepper = randomBytes(32).toString("base64");
const iv = randomBytes(12);
const article = "<h1>Private fixture</h1><p>CONFIDENTIAL_TEST_MARKER</p>";
const key = scryptSync(password + pepper, salt, 32, { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 });
const cipher = createCipheriv("aes-256-gcm", key, iv);
cipher.setAAD(Buffer.from(id));
const ciphertext = Buffer.concat([cipher.update(article), cipher.final()]);
key.fill(0);
const secret = JSON.stringify({
  id,
  salt: salt.toString("base64"),
  pepper,
  iv: iv.toString("base64"),
  tag: cipher.getAuthTag().toString("base64"),
  ciphertext: ciphertext.toString("base64"),
});
const port = "3028";
const base = `http://127.0.0.1:${port}`;
const path = `/private/${id}`;
const server = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", port],
  {
    env: { ...process.env, VERCEL: "", PRIVATE_WRITING_V1: secret },
    stdio: "ignore",
  },
);
let count = 0;
async function check(url, options, status, unlocked = false) {
  const response = await fetch(base + url, options);
  const body = await response.text();
  assert.equal(response.status, status);
  assert.equal(body.includes("CONFIDENTIAL_TEST_MARKER"), unlocked);
  if (url.startsWith("/private/")) {
    assert.match(response.headers.get("cache-control"), /no-store/);
    assert.match(response.headers.get("x-robots-tag"), /noindex/);
    assert.match(response.headers.get("content-security-policy"), /default-src 'none'/);
    assert.equal(response.headers.get("set-cookie"), null);
    assert.doesNotMatch(body, /<script|google-analytics|googletagmanager|__next_f/);
    if (unlocked) assert.ok(body.includes(article));
  }
  count++;
}
const post = (value, origin = base) => ({
  method: "POST",
  headers: { origin, "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ password: value }),
});
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error("Test server exited");
    try {
      await fetch(base + path);
      ready = true;
      break;
    } catch {
      await setTimeout(100);
    }
  }
  assert.ok(ready, "Test server ready");
  await check(path, {}, 200);
  await check(path, { method: "HEAD" }, 200);
  await check(`${path}?_rsc=test`, { headers: { RSC: "1" } }, 200);
  await check(`${path}?password=${encodeURIComponent(password)}`, {}, 200);
  await check(`/private/${"0".repeat(32)}`, {}, 404);
  await check(path, post("wrong"), 401);
  await check(path, post(password, "https://example.com"), 403);
  await check(path, post("a".repeat(2000)), 413);
  await check(path, post(password), 200, true);
  await check(path, {}, 200);
  await check("/", {}, 200);
  await check("/private-post.css", {}, 200);
  console.log(`Passed ${count} private-writing authentication, leak and security-header checks.`);
} finally {
  server.kill("SIGTERM");
  if (server.exitCode === null) await once(server, "exit");
}

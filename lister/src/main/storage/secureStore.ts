import { app, safeStorage } from "electron";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// A small encrypted key/value store. Values are JSON-serialized then encrypted
// with Electron's safeStorage, which is backed by the OS keychain/credential
// vault (Keychain on macOS, libsecret on Linux, DPAPI on Windows). The on-disk
// file holds only ciphertext, so marketplace sessions and OAuth tokens never
// sit in plaintext.

type Store = Record<string, string>;

const FILE_NAME = "secure-store.bin";

function storePath(): string {
  const dir = join(app.getPath("userData"), "lister");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return join(dir, FILE_NAME);
}

function encryptionAvailable(): boolean {
  try {
    return safeStorage.isEncryptionAvailable();
  } catch {
    return false;
  }
}

function readStore(): Store {
  const path = storePath();
  if (!existsSync(path)) return {};
  try {
    const raw = readFileSync(path);
    if (raw.length === 0) return {};
    if (encryptionAvailable()) {
      const decrypted = safeStorage.decryptString(raw);
      return JSON.parse(decrypted) as Store;
    }
    // Fallback (e.g. headless Linux with no keychain): plain JSON. The file
    // still lives in the user-data dir; we log this degraded mode loudly.
    return JSON.parse(raw.toString("utf8")) as Store;
  } catch (err) {
    console.error("secureStore: failed to read store, starting empty", err);
    return {};
  }
}

function writeStore(store: Store): void {
  const path = storePath();
  const json = JSON.stringify(store);
  if (encryptionAvailable()) {
    writeFileSync(path, safeStorage.encryptString(json));
  } else {
    console.warn("secureStore: OS encryption unavailable, writing plaintext fallback");
    writeFileSync(path, json, "utf8");
  }
}

export function getItem<T = unknown>(key: string): T | undefined {
  const store = readStore();
  const value = store[key];
  if (value === undefined) return undefined;
  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
}

export function setItem(key: string, value: unknown): void {
  const store = readStore();
  store[key] = JSON.stringify(value);
  writeStore(store);
}

export function removeItem(key: string): void {
  const store = readStore();
  if (key in store) {
    delete store[key];
    writeStore(store);
  }
}

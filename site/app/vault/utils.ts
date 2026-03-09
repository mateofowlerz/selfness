import fs from "node:fs";
import path from "node:path";

interface VaultItem {
  id: string;
  title: string;
  subtitle?: string;
  url: string;
  image: string;
}

export function getVault(): VaultItem[] {
  const vaultPath = path.join(process.cwd(), "..", "vault.json");
  try {
    const data = fs.readFileSync(vaultPath, "utf-8");
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

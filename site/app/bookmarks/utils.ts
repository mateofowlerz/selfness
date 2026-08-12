import fs from "node:fs";
import path from "node:path";

export interface Bookmark {
  id: string;
  title: string;
  subtitle?: string;
  url: string;
  kind: string;
}

export function getBookmarks(): Bookmark[] {
  const bookmarksPath = path.join(process.cwd(), "..", "bookmarks.json");

  try {
    const data = fs.readFileSync(bookmarksPath, "utf-8");
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

import fs from "fs";
import path from "path";

export interface Book {
  id: string;
  title: string;
  author: string;
  image: string;
  quarter: string;
  year: number;
  url?: string;
}

export function getLibrary(): Book[] {
  const filePath = path.join(process.cwd(), "..", "library.json");
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}

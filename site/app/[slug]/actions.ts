"use server";

import fs from "node:fs";
import path from "node:path";
import { revalidatePath } from "next/cache";

const WRITINGS_DIR = path.join(process.cwd(), "..", "writings");
const FRONTMATTER = /^---\n[\s\S]*?\n---\n/;

type Patch = {
  slug: string;
  start: number;
  end: number;
  expected: string;
  replacement: string;
};

export async function patchWriting({ slug, start, end, expected, replacement }: Patch) {
  if (process.env.NODE_ENV === "production") {
    return { error: "Editing is only available locally" };
  }

  if (!/^[a-z0-9-]+$/.test(slug)) {
    return { error: "Invalid slug" };
  }

  const filePath = path.join(WRITINGS_DIR, `${slug}.md`);

  if (!fs.existsSync(filePath)) {
    return { error: "Writing not found" };
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const frontmatter = content.match(FRONTMATTER)?.[0] ?? "";
  const body = content.slice(frontmatter.length);

  // offsets come from the rendered source, so make sure they still point at the same text
  if (body.slice(start, end) !== expected) {
    return { error: "File changed on disk — reload" };
  }

  fs.writeFileSync(filePath, frontmatter + body.slice(0, start) + replacement + body.slice(end));

  revalidatePath("/");
  revalidatePath(`/${slug}`);

  return { success: true };
}

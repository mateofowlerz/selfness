import fs from "node:fs";
import path from "node:path";

export type Writing = {
  date: string | null;
  slug: string;
  title: string;
};

export type WritingDocument = Writing & {
  content: string;
  hidden: boolean;
};

const WRITINGS_DIR = path.join(process.cwd(), "..", "writings");

function getFrontmatter(content: string): string | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  return match?.[1] ?? null;
}

function getFrontmatterField(frontmatter: string | null, field: string): string | null {
  if (!frontmatter) {
    return null;
  }

  const match = frontmatter.match(new RegExp(`^${field}:\\s*(.+)$`, "m"));
  return match?.[1]?.trim() ?? null;
}

function getBooleanFrontmatterField(frontmatter: string | null, field: string): boolean {
  return getFrontmatterField(frontmatter, field) === "true";
}

function formatFallbackTitle(slug: string) {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function sortWritings<T extends Writing>(writings: T[]): T[] {
  return [...writings].sort((a, b) => {
    if (a.date && b.date && a.date !== b.date) {
      return b.date.localeCompare(a.date);
    }

    if (a.date && !b.date) {
      return -1;
    }

    if (!a.date && b.date) {
      return 1;
    }

    return a.title.localeCompare(b.title);
  });
}

function getAllWritingDocuments(): WritingDocument[] {
  if (!fs.existsSync(WRITINGS_DIR)) {
    return [];
  }

  return sortWritings(
    fs
      .readdirSync(WRITINGS_DIR)
      .filter((file) => file.endsWith(".md"))
      .map((file) => {
        const slug = file.replace(/\.md$/, "");
        const content = fs.readFileSync(path.join(WRITINGS_DIR, file), "utf-8");
        const frontmatter = getFrontmatter(content);

        return {
          content,
          date: getFrontmatterField(frontmatter, "date"),
          hidden: getBooleanFrontmatterField(frontmatter, "hidden"),
          slug,
          title: getFrontmatterField(frontmatter, "title") ?? formatFallbackTitle(slug),
        } satisfies WritingDocument;
      }),
  );
}

export function getAllWritings(): Writing[] {
  return getAllWritingDocuments()
    .filter((writing) => !writing.hidden)
    .map(({ content: _content, hidden: _hidden, ...writing }) => writing);
}

export function getWritingBySlug(slug: string): WritingDocument | null {
  const filePath = path.join(WRITINGS_DIR, `${slug}.md`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const frontmatter = getFrontmatter(content);

  return {
    content,
    date: getFrontmatterField(frontmatter, "date"),
    hidden: getBooleanFrontmatterField(frontmatter, "hidden"),
    slug,
    title: getFrontmatterField(frontmatter, "title") ?? formatFallbackTitle(slug),
  };
}

export function getVisibleWritingSlugs(): string[] {
  return getAllWritings().map(({ slug }) => slug);
}

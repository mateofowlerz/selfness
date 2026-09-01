import fs from "node:fs";
import path from "node:path";
import Image from "next/image";
import { notFound } from "next/navigation";
import React from "react";
import Markdown from "react-markdown";
import ImageGallery from "../components/ImageGallery";
import ImageLink from "../components/ImageLink";
import InlineEditor from "../components/InlineEditor";
import MusicPlayer from "../components/MusicPlayer";
import Sidenote, { NoteBody } from "../components/Sidenote";
import { getVisibleWritingSlugs, getWritingBySlug, stripFrontmatter } from "../lib/writings";

const SUPPORTED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".avif"];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function getImageSlug(src: string | undefined | Blob): string | null {
  if (!src || typeof src !== "string") return null;
  const match = src.match(/\/images\/([^/]+)$/);
  if (!match) return null;
  const filename = match[1];
  const name = filename.substring(0, filename.lastIndexOf("."));
  return slugify(name);
}

function getGalleryImages(folderPath: string): { src: string; slug: string }[] | null {
  const fullPath = path.join(process.cwd(), "public", folderPath);
  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isDirectory()) {
    return null;
  }

  const files = fs.readdirSync(fullPath).filter((file) => {
    const ext = path.extname(file).toLowerCase();
    return SUPPORTED_EXTENSIONS.includes(ext);
  });

  return files.map((file) => ({
    src: `${folderPath}/${file}`,
    slug: slugify(file.substring(0, file.lastIndexOf("."))),
  }));
}

export async function generateStaticParams() {
  return getVisibleWritingSlugs().map((slug) => ({ slug }));
}

type MarkdownNode = { position?: { start: { offset?: number }; end: { offset?: number } } };

// lets the inline editor map a DOM selection back to a range in the markdown file
function sourceRange(node?: MarkdownNode): string | undefined {
  const start = node?.position?.start.offset;
  const end = node?.position?.end.offset;

  return start === undefined || end === undefined ? undefined : `${start}:${end}`;
}

function extractFootnotes(content: string): { body: string; notes: Map<string, string> } {
  const notes = new Map<string, string>();

  const body = content.replace(/^\[\^([^\]]+)\]:[ \t]*(.+)$/gm, (_match, id: string, text: string) => {
    notes.set(id, text.trim());
    return "";
  });

  return { body: body.trimEnd(), notes };
}

function processFootnotes(children: React.ReactNode, notes: Map<string, string>): React.ReactNode {
  if (notes.size === 0) {
    return children;
  }

  const result: React.ReactNode[] = [];

  for (const [index, child] of React.Children.toArray(children).entries()) {
    if (typeof child !== "string") {
      result.push(child);
      continue;
    }

    // odd indexes are the captured footnote ids, even ones the surrounding text
    for (const [partIndex, part] of child.split(/\[\^([^\]]+)\]/).entries()) {
      result.push(
        partIndex % 2 === 1 ? <Sidenote key={`fn-${index}-${part}`} id={part} text={notes.get(part) ?? ""} /> : part,
      );
    }
  }

  return result;
}

function processMusicLinks(children: React.ReactNode): React.ReactNode {
  const childArray = React.Children.toArray(children);
  const result: React.ReactNode[] = [];

  for (let i = 0; i < childArray.length; i++) {
    const child = childArray[i];
    const nextChild = childArray[i + 1];

    const nextProps = React.isValidElement(nextChild)
      ? (nextChild.props as { href?: string; children?: React.ReactNode })
      : null;

    if (
      typeof child === "string" &&
      child.endsWith("▶") &&
      nextProps &&
      typeof nextProps.href === "string" &&
      nextProps.href.endsWith(".mp3")
    ) {
      const textBefore = child.slice(0, -1);
      if (textBefore) result.push(textBefore);

      const linkText = String(nextProps.children);
      const parts = linkText.split("|");
      const title = parts[0] || linkText;
      const album = parts[1] || "";
      const cover = parts[2] || "";

      result.push(<MusicPlayer key={`music-${i}`} src={nextProps.href} title={title} album={album} cover={cover} />);
      i++;
    } else {
      result.push(child);
    }
  }
  return result;
}

export default async function Writing({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const writing = getWritingBySlug(slug);

  if (!writing || writing.hidden) {
    notFound();
  }

  const { body, notes } = extractFootnotes(stripFrontmatter(writing.content));

  return (
    <main>
      <Markdown
        components={{
          h1: ({ children, node }) => <h1 data-src={sourceRange(node)}>{children}</h1>,
          h2: ({ children, node }) => <h2 data-src={sourceRange(node)}>{children}</h2>,
          p: ({ children, node }) => (
            <p className="mb-6" data-src={sourceRange(node)}>
              {processFootnotes(processMusicLinks(children), notes)}
            </p>
          ),
          strong: ({ children }) => <strong>{children}</strong>,
          em: ({ children }) => <em>{children}</em>,
          img: ({ src, alt }) => {
            if (!src || typeof src !== "string") {
              return null;
            }

            // Check if it's a folder (gallery)
            const galleryImages = getGalleryImages(src);
            if (galleryImages && galleryImages.length > 0) {
              return <ImageGallery images={galleryImages} alt={alt ?? ""} />;
            }

            // Single image
            const imageSlug = getImageSlug(src);
            if (!imageSlug) {
              return <Image src={src} alt={alt ?? ""} width={800} height={600} unoptimized />;
            }
            return <ImageLink href={`/images/${imageSlug}`} src={src} alt={alt ?? ""} />;
          },
          a: ({ href, children }) => (
            <a href={href} className="text-primary underline hover:text-primary-dark">
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="mb-6 border-l-[3px] border-(--muted)/30 pl-4 [&>p]:mb-0 [&>p+p]:mt-4">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="mt-4 mb-10 border-0 border-t border-muted/20" />,
          ul: ({ children }) => <ul>{children}</ul>,
          ol: ({ children }) => <ol className="mb-6 list-decimal pl-6 [&_ol]:mt-1 [&_ol]:mb-0">{children}</ol>,
          li: ({ children, node }) => (
            <li className="mb-1" data-src={sourceRange(node)}>
              {processFootnotes(children, notes)}
            </li>
          ),
        }}
      >
        {body}
      </Markdown>
      {process.env.NODE_ENV === "production" ? null : <InlineEditor slug={slug} source={body} />}
      {notes.size > 0 ? (
        <ol className="mt-12 list-decimal border-t border-muted/10 pt-6 pl-5 text-sm text-(--muted) xl:hidden">
          {[...notes].map(([id, text]) => (
            <li key={id} id={`fn-${id}`} className="mb-2">
              <NoteBody text={text} />
            </li>
          ))}
        </ol>
      ) : null}
    </main>
  );
}

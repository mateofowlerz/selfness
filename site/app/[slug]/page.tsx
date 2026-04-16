import fs from "node:fs";
import path from "node:path";
import Image from "next/image";
import { notFound } from "next/navigation";
import React from "react";
import Markdown from "react-markdown";
import ImageGallery from "../components/ImageGallery";
import ImageLink from "../components/ImageLink";
import MusicPlayer from "../components/MusicPlayer";
import { getVisibleWritingSlugs, getWritingBySlug } from "../lib/writings";

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

function stripFrontmatter(content: string) {
  return content.replace(/^---\n[\s\S]*?\n---\n/, "");
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

  const content = stripFrontmatter(writing.content);

  return (
    <main>
      <Markdown
        components={{
          h1: ({ children }) => <h1>{children}</h1>,
          h2: ({ children }) => <h2>{children}</h2>,
          p: ({ children }) => <p className="mb-6">{processMusicLinks(children)}</p>,
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
          ul: ({ children }) => <ul>{children}</ul>,
          li: ({ children }) => <li>{children}</li>,
        }}
      >
        {content}
      </Markdown>
    </main>
  );
}

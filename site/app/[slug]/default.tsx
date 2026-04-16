import Image from "next/image";
import Link from "next/link";
import Markdown from "react-markdown";
import { getWritingBySlug } from "../lib/writings";

function getImageSlug(src: string | undefined | Blob): string | null {
  if (!src || typeof src !== "string") return null;
  const match = src.match(/\/images\/([^/]+)$/);
  if (!match) return null;
  const filename = match[1];
  const name = filename.substring(0, filename.lastIndexOf("."));
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default async function WritingDefault({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const writing = getWritingBySlug(slug);

  if (!writing || writing.hidden) {
    return null;
  }

  return (
    <main>
      <Markdown
        components={{
          h1: ({ children }) => <h1>{children}</h1>,
          h2: ({ children }) => <h2>{children}</h2>,
          p: ({ children }) => <p>{children}</p>,
          strong: ({ children }) => <strong>{children}</strong>,
          em: ({ children }) => <em>{children}</em>,
          img: ({ src, alt }) => {
            const imageSlug = getImageSlug(src);
            const imgSrc = typeof src === "string" ? src : undefined;
            if (!imgSrc) return null;
            return (
              <Link href={imageSlug ? `/images/${imageSlug}` : "#"} className="backlink">
                <span className="backlink-thumb">
                  <Image src={imgSrc} alt="" width={40} height={40} className="thumb-img" unoptimized />
                </span>
                {alt}
                <Image src={imgSrc} alt={alt ?? ""} width={300} height={200} className="backlink-preview" unoptimized />
              </Link>
            );
          },
          a: ({ href, children }) => <a href={href}>{children}</a>,
          ul: ({ children }) => <ul>{children}</ul>,
          li: ({ children }) => <li>{children}</li>,
        }}
      >
        {writing.content}
      </Markdown>
    </main>
  );
}

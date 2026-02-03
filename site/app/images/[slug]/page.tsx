import fs from "node:fs";
import path from "node:path";
import Image from "next/image";
import Link from "next/link";

const SUPPORTED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"];

function getImages() {
  const imagesDir = path.join(process.cwd(), "public", "images");

  if (!fs.existsSync(imagesDir)) {
    return [];
  }

  return fs.readdirSync(imagesDir).filter((file) => {
    const ext = path.extname(file).toLowerCase();
    return SUPPORTED_EXTENSIONS.includes(ext);
  });
}

function slugify(filename: string): string {
  // Remove extension and create URL-friendly slug
  const name = filename.substring(0, filename.lastIndexOf("."));
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function formatTitle(filename: string): string {
  // Remove extension and format as title
  const name = filename.substring(0, filename.lastIndexOf("."));
  return name.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function generateStaticParams() {
  const images = getImages();
  return images.map((file) => ({ slug: slugify(file) }));
}

export default async function ImagePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const images = getImages();

  // Find the original filename from the slug
  const imageFile = images.find((file) => slugify(file) === slug);

  if (!imageFile) {
    return (
      <main>
        <h1>Image not found</h1>
        <Link href="/">← Back to writings</Link>
      </main>
    );
  }

  const title = formatTitle(imageFile);
  const imagePath = `/images/${imageFile}`;

  return (
    <main className="image-page">
      <Link href="/" className="back-link">
        ← Back
      </Link>
      <figure className="image-container">
        <Image src={imagePath} alt={title} width={1200} height={800} className="full-image" unoptimized />
        <figcaption className="image-title">{title}</figcaption>
      </figure>
    </main>
  );
}

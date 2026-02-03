import fs from "node:fs";
import path from "node:path";
import CarouselModal from "../../../components/CarouselModal";
import Modal from "../../../components/Modal";
import SingleImageModal from "../../../components/SingleImageModal";

const SUPPORTED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".avif"];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function formatTitle(filename: string): string {
  const name = filename.substring(0, filename.lastIndexOf("."));
  return name.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getAllImages(): { file: string; folder: string }[] {
  const imagesDir = path.join(process.cwd(), "public", "images");
  if (!fs.existsSync(imagesDir)) return [];

  const results: { file: string; folder: string }[] = [];

  // Get images from root
  const rootFiles = fs.readdirSync(imagesDir).filter((file) => {
    const fullPath = path.join(imagesDir, file);
    if (fs.statSync(fullPath).isDirectory()) return false;
    const ext = path.extname(file).toLowerCase();
    return SUPPORTED_EXTENSIONS.includes(ext);
  });
  for (const file of rootFiles) {
    results.push({ file, folder: "" });
  }

  // Get images from subfolders
  const subdirs = fs.readdirSync(imagesDir).filter((file) => {
    const fullPath = path.join(imagesDir, file);
    return fs.statSync(fullPath).isDirectory();
  });
  for (const subdir of subdirs) {
    const subPath = path.join(imagesDir, subdir);
    const subFiles = fs.readdirSync(subPath).filter((file) => {
      const ext = path.extname(file).toLowerCase();
      return SUPPORTED_EXTENSIONS.includes(ext);
    });
    for (const file of subFiles) {
      results.push({ file, folder: subdir });
    }
  }

  return results;
}

function findImageBySlug(images: { file: string; folder: string }[], slug: string) {
  const found = images.find((img) => {
    const name = img.file.substring(0, img.file.lastIndexOf("."));
    return slugify(name) === slug;
  });
  if (!found) return null;
  const srcPath = found.folder ? `/images/${found.folder}/${found.file}` : `/images/${found.file}`;
  return {
    src: srcPath,
    title: formatTitle(found.file),
  };
}

export default async function ImageModal({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ gallery?: string }>;
}) {
  const { slug } = await params;
  const { gallery } = await searchParams;
  const allImages = getAllImages();

  // Gallery mode: multiple images
  if (gallery) {
    const slugs = gallery.split(",");
    const galleryImages = slugs
      .map((s) => findImageBySlug(allImages, s))
      .filter((img): img is { src: string; title: string } => img !== null);

    if (galleryImages.length === 0) {
      return (
        <Modal>
          <p>Images not found</p>
        </Modal>
      );
    }

    const initialIndex = slugs.indexOf(slug);

    return <CarouselModal images={galleryImages} initialIndex={initialIndex >= 0 ? initialIndex : 0} />;
  }

  // Single image mode
  const image = findImageBySlug(allImages, slug);

  if (!image) {
    return (
      <Modal>
        <p>Image not found</p>
      </Modal>
    );
  }

  return <SingleImageModal src={image.src} title={image.title} />;
}

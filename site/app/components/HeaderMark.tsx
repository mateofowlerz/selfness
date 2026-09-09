"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";

export default function HeaderMark() {
  const pathname = usePathname();
  const mark =
    pathname === "/"
      ? {
          src: "/portraits/mateo-stencil-transparent.png",
          alt: "Stencil portrait of Mateo wearing a beret with a red star",
        }
      : pathname === "/startups-vs-labs"
        ? {
            src: "/marks/startups-vs-labs-star.png",
            alt: "A red star breaking free from a fractured black block",
          }
        : null;

  if (!mark) return null;

  return (
    <Image
      src={mark.src}
      alt={mark.alt}
      width={1254}
      height={1254}
      sizes="(min-width: 640px) 96px, 80px"
      className="h-auto w-20 shrink-0 sm:w-24"
    />
  );
}

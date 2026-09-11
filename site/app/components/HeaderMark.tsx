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
        : pathname === "/anthropic-cybersecurity-investigation"
          ? {
              src: "/marks/anthropic-skull-parcel.png",
              alt: "A black parcel with a skull seal and a red ribbon shaped like a forked tongue",
            }
          : null;

  if (!mark) return null;

  if (pathname === "/anthropic-cybersecurity-investigation") {
    return (
      <div className="relative w-28 shrink-0 self-stretch overflow-hidden sm:w-32">
        <Image
          src={mark.src}
          alt={mark.alt}
          width={1024}
          height={1024}
          sizes="256px"
          className="absolute top-1/2 left-1/2 h-[200%] w-[160%] max-w-none object-contain -translate-x-1/2 -translate-y-1/2 mix-blend-multiply brightness-105"
        />
      </div>
    );
  }

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

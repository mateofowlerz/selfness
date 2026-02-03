"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import TextWithImage from "./TextWithImage";

interface ImageLinkProps {
  href: string;
  src: string | undefined;
  alt: string;
}

export default function ImageLink({ href, src, alt }: ImageLinkProps) {
  const router = useRouter();
  const linkRef = useRef<HTMLAnchorElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [openDirection, setOpenDirection] = useState<"top" | "bottom">("bottom");
  const [isHovering, setIsHovering] = useState(false);

  const updateOpenDirection = useCallback(() => {
    const el = linkRef.current;
    if (!el || !src) return;

    const rect = el.getBoundingClientRect();
    const availableAbove = rect.top;
    const availableBelow = window.innerHeight - rect.bottom;

    // Estimate preview height (image + padding).
    const previewHeight = 320 + 16;
    const shouldOpenAbove = availableBelow < previewHeight && availableAbove > availableBelow;

    setOpenDirection(shouldOpenAbove ? "top" : "bottom");
  }, [src]);

  const handleMouseEnter = useCallback(() => {
    updateOpenDirection();

    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovering(true);
    }, 50);
  }, [updateOpenDirection]);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setIsHovering(false);
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();

      if (document.startViewTransition) {
        document.startViewTransition(() => {
          router.push(href);
        });
      } else {
        router.push(href);
      }
    },
    [href, router],
  );

  return (
    <Link
      href={href}
      className="relative cursor-pointer text-primary md:hover:text-primary-dark transition-colors duration-150 whitespace-nowrap no-underline"
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={updateOpenDirection}
      ref={linkRef}
    >
      <TextWithImage src={src} alt={alt} className="contents" />
      {src && (
        <span
          className={`
						absolute left-1/2 -translate-x-1/2 z-100
						${openDirection === "top" ? "bottom-full pb-4 origin-bottom" : "top-full pt-4 origin-top"}
						transition-all duration-200
						${
              isHovering
                ? "opacity-100 scale-100 pointer-events-auto ease-in"
                : "opacity-0 scale-[0.96] pointer-events-none ease-out"
            }
					`}
        >
          <Image
            src={src}
            alt={alt}
            width={380}
            height={320}
            className="max-w-[380px] max-h-[320px] w-auto h-auto rounded-md shadow-[0_8px_32px_rgba(0,0,0,0.18),0_0_0_1px_rgba(0,0,0,0.06)]"
          />
        </span>
      )}
    </Link>
  );
}

"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

const slides = [
  {
    src: "/images/about-carousel-1.png",
    alt: "Mateo standing in front of a pirate flag",
    width: 1024,
    height: 768,
  },
  {
    src: "/images/about-carousel-2.png",
    alt: "Mateo sitting at a desk drinking mate",
    width: 1279,
    height: 847,
  },
];

const clampIndex = (index: number) => Math.max(0, Math.min(index, slides.length - 1));
const snapDurationMs = 150;
const easeOutCubic = (progress: number) => 1 - (1 - progress) ** 3;

export default function AboutCarousel() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const dragRef = useRef({
    active: false,
    startX: 0,
    scrollLeft: 0,
    moved: false,
  });
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const scrollToIndex = useCallback((index: number) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    scroller.style.scrollSnapType = "none";

    const targetLeft = clampIndex(index) * scroller.clientWidth;
    const startLeft = scroller.scrollLeft;
    const distance = targetLeft - startLeft;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || Math.abs(distance) < 1) {
      scroller.scrollLeft = targetLeft;
      scroller.style.scrollSnapType = "";
      return;
    }

    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / snapDurationMs, 1);
      scroller.scrollLeft = startLeft + distance * easeOutCubic(progress);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        animationRef.current = null;
        scroller.scrollLeft = targetLeft;
        scroller.style.scrollSnapType = "";
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, []);

  const updateDragPosition = useCallback((clientX: number) => {
    const scroller = scrollerRef.current;
    const drag = dragRef.current;
    if (!drag.active || !scroller) return;

    const deltaX = clientX - drag.startX;
    if (Math.abs(deltaX) > 3) {
      drag.moved = true;
    }
    scroller.scrollLeft = drag.scrollLeft - deltaX;
  }, []);

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      event.preventDefault();
      updateDragPosition(event.clientX);
    },
    [updateDragPosition],
  );

  const finishDrag = useCallback(() => {
    const scroller = scrollerRef.current;
    const drag = dragRef.current;
    if (!drag.active || !scroller) return;

    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", finishDrag);

    drag.active = false;
    setIsDragging(false);

    if (drag.moved) {
      const nextIndex = clampIndex(Math.round(scroller.scrollLeft / Math.max(scroller.clientWidth, 1)));
      scrollToIndex(nextIndex);
    } else {
      scroller.style.scrollSnapType = "";
    }
  }, [handleMouseMove, scrollToIndex]);

  useEffect(() => {
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", finishDrag);
    };
  }, [finishDrag, handleMouseMove]);

  return (
    <div>
      <section
        ref={scrollerRef}
        aria-label="Personal photos"
        className={`flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-md bg-black/5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${
          isDragging ? "cursor-grabbing select-none scroll-auto" : "cursor-grab"
        }`}
        onMouseDown={(event) => {
          if (event.button !== 0) return;
          const scroller = scrollerRef.current;
          if (!scroller) return;

          event.preventDefault();
          if (animationRef.current !== null) {
            cancelAnimationFrame(animationRef.current);
            animationRef.current = null;
          }
          scroller.style.scrollSnapType = "none";
          dragRef.current = {
            active: true,
            startX: event.clientX,
            scrollLeft: scroller.scrollLeft,
            moved: false,
          };
          window.addEventListener("mousemove", handleMouseMove);
          window.addEventListener("mouseup", finishDrag);
          setIsDragging(true);
        }}
      >
        {slides.map((slide, index) => (
          <div key={slide.src} className="relative aspect-[4/3] w-full shrink-0 snap-center overflow-hidden">
            <Image
              src={slide.src}
              alt={slide.alt}
              width={slide.width}
              height={slide.height}
              priority={index === 0}
              draggable={false}
              className="h-full w-full object-cover"
              sizes="(max-width: 704px) calc(100vw - 32px), 640px"
            />
          </div>
        ))}
      </section>
    </div>
  );
}

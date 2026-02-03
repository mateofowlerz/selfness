"use client";

import { useCallback, useState } from "react";
import Modal from "./Modal";
import ModalImage from "./ModalImage";

interface CarouselImage {
  src: string;
  title: string;
}

interface CarouselModalProps {
  images: CarouselImage[];
  initialIndex?: number;
}

export default function CarouselModal({ images, initialIndex = 0 }: CarouselModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const currentImage = images[currentIndex];
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < images.length - 1;

  const goToPrev = useCallback(() => {
    if (hasPrev) {
      setCurrentIndex((i) => i - 1);
    }
  }, [hasPrev]);

  const goToNext = useCallback(() => {
    if (hasNext) {
      setCurrentIndex((i) => i + 1);
    }
  }, [hasNext]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goToNext();
      }
    },
    [goToPrev, goToNext],
  );

  const navButtons = (
    <>
      {/* Left arrow */}
      {hasPrev && (
        <button
          type="button"
          onClick={goToPrev}
          className="fixed top-1/2 left-1 sm:left-4 md:left-8 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-white/90 border border-black/15 rounded-full cursor-pointer text-fg transition-colors md:hover:bg-white md:hover:border-black/25 z-1001"
          aria-label="Previous image"
        >
          <svg
            className="w-5 h-5 sm:w-6 sm:h-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <title>Previous</title>
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      )}

      {/* Right arrow */}
      {hasNext && (
        <button
          type="button"
          onClick={goToNext}
          className="fixed top-1/2 right-1 sm:right-4 md:right-8 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-white/90 border border-black/15 rounded-full cursor-pointer text-fg transition-colors md:hover:bg-white md:hover:border-black/25 z-1001"
          aria-label="Next image"
        >
          <svg
            className="w-5 h-5 sm:w-6 sm:h-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <title>Next</title>
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      )}
    </>
  );

  const caption = (
    <span className="px-4 sm:px-0">
      {currentImage.title}
      {images.length > 1 && (
        <span className="carousel-indicator">
          {currentIndex + 1} / {images.length}
        </span>
      )}
    </span>
  );

  return (
    <Modal onKeyDown={handleKeyDown} outsideContent={navButtons}>
      <ModalImage
        src={currentImage.src}
        alt={currentImage.title}
        caption={caption}
        className="h-[80vh] md:h-[70vh] w-auto max-w-[calc(100vw-4rem)] md:max-w-[85vw] object-contain"
      />
    </Modal>
  );
}

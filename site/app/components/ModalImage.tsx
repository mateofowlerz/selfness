"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

interface ModalImageProps {
  src: string;
  alt: string;
  caption?: React.ReactNode;
  className?: string;
}

export default function ModalImage({ src, alt, caption, className = "" }: ModalImageProps) {
  const [isLoading, setIsLoading] = useState(true);

  // Reset loading state when src changes (for carousel navigation)
  useEffect(() => {
    // src changed, reset loading
    if (src) setIsLoading(true);
  }, [src]);

  return (
    <figure className="modal-image-container relative flex items-center justify-center">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 border-3 border-black/10 border-t-black/40 rounded-full animate-spin" />
        </div>
      )}
      <Image
        src={src}
        alt={alt}
        width={1200}
        height={800}
        className={`modal-image transition-opacity duration-200 ${isLoading ? "opacity-0" : "opacity-100"} ${className}`}
        onLoad={() => setIsLoading(false)}
      />
      {!isLoading && caption && <figcaption className="modal-image-title">{caption}</figcaption>}
    </figure>
  );
}

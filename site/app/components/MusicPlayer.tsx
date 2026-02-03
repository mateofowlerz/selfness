"use client";

import { useEffect, useState } from "react";
import { isTrackPlaying, subscribe, togglePlay } from "../lib/audioState";

export default function MusicPlayer({
  src,
  title,
  album,
  cover,
}: {
  src: string;
  title: string;
  album: string;
  cover: string;
}) {
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const update = () => setIsPlaying(isTrackPlaying(src));
    update();
    return subscribe(update);
  }, [src]);

  const handleClick = () => {
    togglePlay({ src, title, album, cover });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-baseline gap-1 bg-transparent border-none p-0 m-0 font-[inherit] cursor-pointer text-primary md:hover:text-primary-dark transition-colors duration-150"
    >
      {isPlaying ? (
        <svg
          aria-label="Pause"
          width="10"
          height="10"
          viewBox="0 0 12 14"
          fill="currentColor"
          className="relative top-[1px]"
        >
          <title>Pause</title>
          <rect x="0" y="0" width="4" height="14" rx="1" />
          <rect x="8" y="0" width="4" height="14" rx="1" />
        </svg>
      ) : (
        <svg
          aria-label="Play"
          width="10"
          height="10"
          viewBox="0 0 12 14"
          fill="currentColor"
          className="relative top-[1px]"
        >
          <title>Play</title>
          <path d="M0 0.5C0 0.191 0.328 0 0.6 0.158L11.4 6.658C11.672 6.816 11.672 7.184 11.4 7.342L0.6 13.842C0.328 14 0 13.809 0 13.5V0.5Z" />
        </svg>
      )}
      {title}
    </button>
  );
}

"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { getState, seek, subscribe, togglePlay } from "../lib/audioState";

function formatTime(seconds: number): string {
  if (!seconds || !Number.isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function MiniPlayer() {
  const [state, setState] = useState(getState);
  const [visible, setVisible] = useState(false);
  const [forceShow, setForceShow] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return subscribe(() => setState({ ...getState() }));
  }, []);

  useEffect(() => {
    if (state.isPlaying) {
      setVisible(true);
      setForceShow(false);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
    } else if (state.currentTrack && !forceShow) {
      hideTimeoutRef.current = setTimeout(() => {
        setVisible(false);
      }, 3000);
    }
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [state.isPlaying, state.currentTrack, forceShow]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!state.currentTrack) return;
      const threshold = 60;
      const nearBottom = window.innerHeight - e.clientY < threshold;
      if (nearBottom && !visible) {
        setForceShow(true);
        setVisible(true);
      }
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [state.currentTrack, visible]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!state.currentTrack) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (document.querySelector(".modal-overlay")) return;

      if (e.code === "Space") {
        e.preventDefault();
        togglePlay(state.currentTrack);
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        seek(Math.min(state.progress + 5, state.duration));
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        seek(Math.max(state.progress - 5, 0));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [state.currentTrack, state.progress, state.duration]);

  const seekFromEvent = useCallback(
    (clientX: number) => {
      if (!progressRef.current || !state.duration) return;
      const rect = progressRef.current.getBoundingClientRect();
      const clickX = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const percentage = clickX / rect.width;
      seek(percentage * state.duration);
    },
    [state.duration],
  );

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) return;
    seekFromEvent(e.clientX);
  };

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    seekFromEvent(clientX);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientX = "touches" in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      seekFromEvent(clientX);
    };

    const handleEnd = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchmove", handleMove);
    window.addEventListener("touchend", handleEnd);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleEnd);
    };
  }, [isDragging, seekFromEvent]);

  const handleToggle = () => {
    if (state.currentTrack) {
      togglePlay(state.currentTrack);
    }
  };

  const progressPercent = state.duration ? (state.progress / state.duration) * 100 : 0;
  const remaining = state.duration - state.progress;

  if (!state.currentTrack) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-[640px] px-4 sm:px-8"
        >
          <div className="bg-white/95 backdrop-blur-xl rounded-lg  overflow-hidden flex h-[52px]  border border-muted/10">
            {/* Play/Stop button - same width as album (52px) */}
            <button
              type="button"
              onClick={handleToggle}
              className="w-[52px] flex items-center justify-center text-muted md:hover:text-fg transition-colors shrink-0"
            >
              {state.isPlaying ? (
                <svg aria-label="Pause" width="12" height="14" viewBox="0 0 12 14" fill="currentColor">
                  <title>Pause</title>
                  <rect x="0" y="0" width="4" height="14" rx="1" />
                  <rect x="8" y="0" width="4" height="14" rx="1" />
                </svg>
              ) : (
                <svg aria-label="Play" width="12" height="14" viewBox="0 0 12 14" fill="currentColor">
                  <title>Play</title>
                  <path d="M0 0.5C0 0.191 0.328 0 0.6 0.158L11.4 6.658C11.672 6.816 11.672 7.184 11.4 7.342L0.6 13.842C0.328 14 0 13.809 0 13.5V0.5Z" />
                </svg>
              )}
            </button>

            {/* Album cover - square, full height */}
            <Image
              src={state.currentTrack.cover}
              alt={state.currentTrack.album}
              width={52}
              height={52}
              className="h-[52px] w-[52px] object-cover shrink-0"
              draggable={false}
              unoptimized
            />

            {/* Right section with info and progress */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Song info row */}
              <div className="flex-1 flex items-center px-3 min-w-0">
                <div className="flex-1 min-w-0 space-y-0">
                  <div className="text-[13px] font-medium text-fg truncate leading-tight">
                    {state.currentTrack.title}
                  </div>
                  <div className="text-[13px] font-normal text-muted truncate leading-tight">
                    {state.currentTrack.album}
                  </div>
                </div>
                <div className="text-[12px] text-muted shrink-0 tabular-nums ml-3">-{formatTime(remaining)}</div>
              </div>

              {/* Progress bar */}
              <div
                ref={progressRef}
                role="slider"
                tabIndex={0}
                aria-label="Seek"
                aria-valuemin={0}
                aria-valuemax={state.duration || 100}
                aria-valuenow={state.progress}
                onClick={handleProgressClick}
                onMouseDown={handleDragStart}
                onTouchStart={handleDragStart}
                onKeyDown={(e) => {
                  if (!state.duration) return;
                  const step = state.duration * 0.05;
                  if (e.key === "ArrowRight") seek(Math.min(state.progress + step, state.duration));
                  if (e.key === "ArrowLeft") seek(Math.max(state.progress - step, 0));
                }}
                className="h-[3px] bg-primary/20 cursor-pointer relative shrink-0"
              >
                <div
                  className="h-full bg-primary pointer-events-none rounded-r-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

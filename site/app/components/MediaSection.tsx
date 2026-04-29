"use client";

import { useId, useState } from "react";

interface MediaItem {
  title: string;
  outlet: string;
  url: string;
}

const staggerDelays = ["delay-[0ms]", "delay-[20ms]", "delay-[40ms]", "delay-[60ms]", "delay-[80ms]"];

function getStaggerDelay(index: number, total: number, isOpen: boolean) {
  const delayIndex = isOpen ? index : total - index - 1;
  return staggerDelays[Math.min(delayIndex, staggerDelays.length - 1)];
}

export default function MediaSection({ items }: { items: MediaItem[] }) {
  const [isOpen, setIsOpen] = useState(true);
  const panelId = useId();

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen((current) => !current)}
        className="flex min-h-11 cursor-pointer items-center justify-between gap-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30"
      >
        <span className="font-semibold md:hover:text-primary-dark transition-colors">Media</span>
        <span
          aria-hidden="true"
          className={`text-(--muted) transition-transform duration-200 ease-[cubic-bezier(0.215,0.61,0.355,1)] motion-reduce:transition-none ${
            isOpen ? "rotate-90" : "rotate-0"
          }`}
        >
          →
        </span>
      </button>
      <div
        id={panelId}
        aria-hidden={!isOpen}
        className={`grid overflow-hidden transition-[grid-template-rows] duration-150 ease-[cubic-bezier(0.215,0.61,0.355,1)] motion-reduce:transition-none ${
          isOpen
            ? "grid-rows-[1fr] delay-[0ms] pointer-events-auto"
            : "grid-rows-[0fr] delay-[200ms] pointer-events-none"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="flex flex-col gap-2">
            {items.map((item, index) => (
              <a
                key={item.url}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                tabIndex={isOpen ? undefined : -1}
                className={`flex items-center justify-between gap-4 transition-[opacity,filter] duration-[140ms] ease-[cubic-bezier(0.215,0.61,0.355,1)] motion-reduce:delay-0 motion-reduce:transition-none motion-reduce:blur-none ${getStaggerDelay(
                  index,
                  items.length,
                  isOpen,
                )} ${isOpen ? "opacity-100 blur-none" : "opacity-0 blur-[2px]"}`}
              >
                <span className="md:hover:text-primary-dark transition-colors">{item.title}</span>
                <span className="text-sm text-(--muted) whitespace-nowrap">{item.outlet}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

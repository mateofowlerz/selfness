"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import BreakawayMark from "./BreakawayMark";

const ASCENT_DURATION = 2000;
const DESCENT_DURATION = 650;

export default function HeaderMark() {
  const pathname = usePathname();
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pathname !== "/startups-vs-labs") return;
    const mark = container.current;
    const rocket = mark?.querySelector<SVGGElement>("[data-breakaway-rocket]");
    const trails = mark?.querySelectorAll<SVGPathElement>("[data-breakaway-trail]");
    const ticks = mark?.querySelector<SVGPathElement>("[data-breakaway-ticks]");
    if (!mark || !rocket || !trails?.length || !ticks) return;

    // Equal arc-length samples keep the exhaust at the revealed line's tip.
    // The browser plays the shared easing without React updates per frame.
    const path = trails[0];
    const length = path.getTotalLength();
    const frameAt = (t: number): Keyframe => {
      const distance = t * length;
      const point = path.getPointAtLength(distance);
      const before = path.getPointAtLength(Math.max(0, distance - 0.5));
      const after = path.getPointAtLength(Math.min(length, distance + 0.5));
      const radians = Math.atan2(after.y - before.y, after.x - before.x);
      const x = point.x + Math.cos(radians) * 36;
      const y = point.y + Math.sin(radians) * 36;
      const angle = (radians * 180) / Math.PI + 90;
      return {
        transform: t === 1 ? "translate(360px, 82px) rotate(20deg)" : `translate(${x}px, ${y}px) rotate(${angle}deg)`,
        opacity: 1,
      };
    };

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const canHover = window.matchMedia("(hover: hover) and (pointer: fine)");
    let animations: Animation[] = [];
    let hovered = false;

    const runFlight = (from: number, to: number) => {
      for (const animation of animations) animation.cancel();
      const descending = to === 0;
      const timing: KeyframeAnimationOptions = {
        duration: Math.max(1, (descending ? DESCENT_DURATION : ASCENT_DURATION) * Math.abs(to - from)),
        easing: descending ? "cubic-bezier(0.645, 0.045, 0.355, 1)" : "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "both",
      };
      const samples = Array.from({ length: 121 }, (_, index) => {
        const offset = index / 120;
        return { offset, progress: from + (to - from) * offset };
      });
      animations = [
        rocket.animate(
          samples.map(({ offset, progress }) => ({ ...frameAt(progress), offset })),
          timing,
        ),
        ...Array.from(trails, (trail) =>
          trail.animate([{ strokeDashoffset: String(1 - from) }, { strokeDashoffset: String(1 - to) }], timing),
        ),
        ticks.animate(
          samples.map(({ offset, progress }) => ({ offset, opacity: Math.min(progress / 0.18, 1) })),
          timing,
        ),
      ];
      const startTime = document.timeline.currentTime;
      for (const animation of animations) animation.startTime = startTime;
    };

    const moveTo = (target: number) => {
      if (reducedMotion.matches || !animations.length) return;
      // Read the visible distance before changing easing, so interruptions do
      // not jump when switching between a quick descent and a gentle ascent.
      const progress = Math.max(0, Math.min(1, 1 - Number.parseFloat(getComputedStyle(trails[0]).strokeDashoffset)));
      runFlight(progress, target);
    };

    const enter = (event: PointerEvent) => {
      if (event.pointerType === "touch" || !canHover.matches) return;
      hovered = true;
      moveTo(0);
    };
    const leave = () => {
      if (!hovered) return;
      hovered = false;
      moveTo(1);
    };

    const play = () => {
      for (const animation of animations) animation.cancel();
      animations = [];
      if (reducedMotion.matches) return;
      hovered = canHover.matches && mark.matches(":hover");
      runFlight(0, hovered ? 0 : 1);
    };

    play();
    mark.addEventListener("pointerenter", enter);
    mark.addEventListener("pointerleave", leave);
    mark.addEventListener("pointercancel", leave);
    reducedMotion.addEventListener("change", play);
    return () => {
      for (const animation of animations) animation.cancel();
      mark.removeEventListener("pointerenter", enter);
      mark.removeEventListener("pointerleave", leave);
      mark.removeEventListener("pointercancel", leave);
      reducedMotion.removeEventListener("change", play);
    };
  }, [pathname]);

  if (pathname === "/") {
    return (
      <Image
        src="/portraits/mateo-stencil-detailed.png"
        alt="Stencil portrait of Mateo wearing a beret with a red star"
        width={1254}
        height={1254}
        sizes="(min-width: 640px) 96px, 80px"
        className="h-auto w-20 shrink-0 mix-blend-multiply sm:w-24"
      />
    );
  }

  if (pathname !== "/startups-vs-labs") return null;

  return (
    <div ref={container} className="w-20 shrink-0 sm:w-24 [&>svg]:h-auto [&>svg]:w-full">
      <BreakawayMark animated />
    </div>
  );
}

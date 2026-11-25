"use client";

import { REDUCED_MOTION_QUERY } from "@/lib/motionQueries";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * Where the band's top edge sits (as a share of the viewport height) when the
 * growth starts and when it reaches full width. Starts as soon as the band
 * enters from the bottom; finishes once it has risen most of the way up.
 */
const START_AT = 1;
const END_AT = 0.2;

/**
 * Full-bleed band whose background grows sideways into the full width while
 * it scrolls into view (inset, rounded panel → edge-to-edge). It only writes
 * `--grow` (0 → 1) on the element; the CSS draws the background from it.
 * Scrubbed with the scroll, so scrolling back up shrinks it again.
 */
export function GrowBand({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia(REDUCED_MOTION_QUERY);
    let frame = 0;

    const update = () => {
      frame = 0;
      if (reduce.matches) {
        el.style.setProperty("--grow", "1");
        return;
      }
      const vh = window.innerHeight;
      const top = el.getBoundingClientRect().top;
      const raw = (vh * START_AT - top) / (vh * (START_AT - END_AT));
      const p = Math.min(1, Math.max(0, raw));
      el.style.setProperty("--grow", p.toFixed(4));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    reduce.addEventListener("change", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      reduce.removeEventListener("change", schedule);
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

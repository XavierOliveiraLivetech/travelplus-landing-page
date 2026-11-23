"use client";

import { REDUCED_MOTION_QUERY, STORY_POINTER_QUERY } from "@/lib/motionQueries";
import { useEffect } from "react";

/** Between items revealed by the same scroll step. */
const STAGGER_MS = 80;
const MAX_STAGGER_STEPS = 4;
/** Longest reveal (0.6s) + max stagger, with room to spare. */
const ANIM_CLEANUP_MS = 1400;

/**
 * Scroll reveals for phones, touch tablets and narrow windows — the layouts
 * that don't get the pinned desktop story. Elements marked `data-reveal`
 * that start below the fold fade + rise in once they reach the viewport.
 *
 * - Content is never removed from the layout (no shifts while reading) and
 *   anything already on screen at load stays visible.
 * - Each element reveals on its own when its top edge enters the viewport,
 *   so tall stacks (pricing cards on a short phone) can't stay hidden.
 * - Items that enter in the same scroll step get a short stagger.
 * - Off for the desktop story (GSAP owns those reveals) and for
 *   prefers-reduced-motion, where everything is simply shown.
 */
export function ScrollReveal() {
  useEffect(() => {
    const story = window.matchMedia(STORY_POINTER_QUERY);
    const reduce = window.matchMedia(REDUCED_MOTION_QUERY);
    let observer: IntersectionObserver | null = null;
    const timers = new Set<number>();

    const reveal = (el: HTMLElement, delay: number) => {
      el.style.setProperty("--reveal-delay", `${delay}ms`);
      el.dataset.revealAnim = "";
      delete el.dataset.revealPending;
      const id = window.setTimeout(() => {
        timers.delete(id);
        delete el.dataset.revealAnim;
        el.style.removeProperty("--reveal-delay");
      }, ANIM_CLEANUP_MS + delay);
      timers.add(id);
    };

    const teardown = () => {
      observer?.disconnect();
      observer = null;
      for (const id of timers) window.clearTimeout(id);
      timers.clear();
      document
        .querySelectorAll<HTMLElement>("[data-reveal-pending],[data-reveal-anim]")
        .forEach((el) => {
          delete el.dataset.revealPending;
          delete el.dataset.revealAnim;
          el.style.removeProperty("--reveal-delay");
        });
    };

    const setup = () => {
      teardown();
      if (story.matches || reduce.matches) return;

      const io = new IntersectionObserver(
        (entries) => {
          const entering = entries
            .filter((entry) => entry.isIntersecting)
            .sort(
              (a, b) =>
                a.boundingClientRect.top - b.boundingClientRect.top ||
                a.boundingClientRect.left - b.boundingClientRect.left,
            );
          entering.forEach((entry, step) => {
            const el = entry.target as HTMLElement;
            io.unobserve(el);
            reveal(el, Math.min(step, MAX_STAGGER_STEPS) * STAGGER_MS);
          });
        },
        // Fire once the top edge is a little inside the viewport.
        { threshold: 0, rootMargin: "0px 0px -8% 0px" },
      );
      observer = io;

      const fold = window.innerHeight * 0.92;
      document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
        const rect = el.getBoundingClientRect();
        // display:none copies (rect 0) and anything already seen stay as is.
        if (rect.height === 0 || rect.top < fold) return;
        el.dataset.revealPending = "";
        io.observe(el);
      });
    };

    setup();
    story.addEventListener("change", setup);
    reduce.addEventListener("change", setup);
    return () => {
      story.removeEventListener("change", setup);
      reduce.removeEventListener("change", setup);
      teardown();
    };
  }, []);

  return null;
}

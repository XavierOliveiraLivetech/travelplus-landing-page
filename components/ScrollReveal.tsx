"use client";

import { REDUCED_MOTION_QUERY } from "@/lib/motionQueries";
import { useEffect } from "react";

/** Between items revealed by the same scroll step. */
const STAGGER_MS = 110;
const MAX_STAGGER_STEPS = 4;
/**
 * Share of the viewport, from the bottom, an element's top edge has to clear
 * before it fades in. Late enough that the fade plays where the visitor is
 * reading, not while the element is still at the very bottom of the screen.
 */
const TRIGGER_FROM_BOTTOM = 0.25;
/**
 * An element fades out once it is entirely within this share of either
 * screen edge, so the fade-out is still seen as it leaves. Smaller than the
 * fade-in trigger so the two never fight at one scroll position.
 */
const LEAVE_EDGE = 0.08;
const IN_MS = 1100;
const OUT_MS = 650;
/** Longest transition + max stagger, with room to spare. */
const ANIM_CLEANUP_MS = 1900;

/**
 * Natural-scroll reveals on every screen size: elements marked `data-reveal`
 * fade in and rise a little as they come into view, and fade out again as
 * they leave the screen (scrolling either way), so each visit replays it.
 *
 * - Content is never removed from the layout (no shifts while reading) and
 *   anything already on screen at load stays visible.
 * - Each element fades in on its own once its top edge is a quarter of the
 *   way up the viewport, so tall stacks (pricing cards on a short phone)
 *   can't stay hidden.
 * - Items that enter in the same scroll step get a short stagger.
 * - Demos inside an element (useSectionActive) stop while it is hidden and
 *   restart from the first frame when it fades back in.
 * - Off for prefers-reduced-motion, where everything is simply shown.
 */
export function ScrollReveal() {
  useEffect(() => {
    const reduce = window.matchMedia(REDUCED_MOTION_QUERY);
    const timers = new Map<HTMLElement, number>();

    const clearAnim = (el: HTMLElement) => {
      delete el.dataset.revealAnim;
      el.style.removeProperty("--reveal-delay");
      el.style.removeProperty("--reveal-dur");
    };

    const animate = (el: HTMLElement, delay: number, durationMs: number) => {
      window.clearTimeout(timers.get(el));
      el.style.setProperty("--reveal-delay", `${delay}ms`);
      el.style.setProperty("--reveal-dur", `${durationMs}ms`);
      el.dataset.revealAnim = "";
      timers.set(
        el,
        window.setTimeout(() => {
          timers.delete(el);
          clearAnim(el);
        }, ANIM_CLEANUP_MS + delay),
      );
    };

    const show = (el: HTMLElement, delay: number) => {
      animate(el, delay, IN_MS);
      delete el.dataset.revealPending;
    };

    /**
     * `side` is the screen edge the item is hidden past. The CSS offsets it
     * towards that edge, so it always moves with the scroll: from below it
     * rises in, from above (scrolling back up) it comes down in, and on the
     * way out it drifts off through the edge it leaves by.
     */
    const hide = (el: HTMLElement, side: Side) => {
      animate(el, 0, OUT_MS);
      el.dataset.revealPending = side;
    };

    let tracked: HTMLElement[] = [];
    let frame = 0;

    /*
     * Level-based, not edge-based: every scroll frame compares each element's
     * current position with two disjoint zones, so the result only depends on
     * where it is now — never on which crossings an observer happened to see
     * (fast scrolls and turning around inside an edge band used to leave
     * items hidden on screen).
     *   show: top above the trigger line AND bottom below the top band
     *   hide: entirely inside the top band OR entirely inside the bottom band
     * In between, an item keeps its state (hysteresis, no flicker).
     */
    const zones = () => {
      const vh = window.innerHeight;
      return {
        trigger: vh * (1 - TRIGGER_FROM_BOTTOM),
        topBand: vh * LEAVE_EDGE,
        bottomBand: vh * (1 - LEAVE_EDGE),
      };
    };
    type Box = { top: number; bottom: number; left: number; height: number };
    type Side = "top" | "bottom";
    /**
     * Viewport box from layout offsets, ignoring CSS transforms: the
     * pending state's own 2.25rem shift (and the fade's motion) must not move
     * an item between zones, or it could flip back and forth at an edge.
     */
    const box = (el: HTMLElement): Box => {
      let top = 0;
      let left = 0;
      let node: HTMLElement | null = el;
      while (node) {
        top += node.offsetTop;
        left += node.offsetLeft;
        node = node.offsetParent as HTMLElement | null;
      }
      top -= window.scrollY;
      const height = el.offsetHeight;
      return { top, bottom: top + height, left, height };
    };
    const inShowZone = (r: Box, z: ReturnType<typeof zones>) =>
      r.top < z.trigger && r.bottom > z.topBand;
    const inHideZone = (r: Box, z: ReturnType<typeof zones>) =>
      r.bottom <= z.topBand || r.top >= z.bottomBand;
    /** Which edge a hidden item sits beyond (by its middle). */
    const sideOf = (r: Box): Side =>
      r.top + r.height / 2 < window.innerHeight / 2 ? "top" : "bottom";

    const update = () => {
      frame = 0;
      const z = zones();
      const entering: { el: HTMLElement; r: Box }[] = [];
      for (const el of tracked) {
        const r = box(el);
        if (r.height === 0) continue; // display:none copy
        const pending = el.hasAttribute("data-reveal-pending");
        if (pending && inShowZone(r, z)) entering.push({ el, r });
        else if (!pending && inHideZone(r, z)) hide(el, sideOf(r));
        else if (pending && inHideZone(r, z)) {
          // Still hidden but jumped past the other edge (fast scroll):
          // face the edge it will come back through. Invisible, no motion.
          const side = sideOf(r);
          if (el.dataset.revealPending !== side) {
            clearAnim(el);
            el.dataset.revealPending = side;
          }
        }
      }
      entering
        .sort((a, b) => a.r.top - b.r.top || a.r.left - b.r.left)
        .forEach(({ el }, step) =>
          show(el, Math.min(step, MAX_STAGGER_STEPS) * STAGGER_MS),
        );
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    const teardown = () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(frame);
      frame = 0;
      tracked = [];
      for (const id of timers.values()) window.clearTimeout(id);
      timers.clear();
      document
        .querySelectorAll<HTMLElement>("[data-reveal-pending],[data-reveal-anim]")
        .forEach((el) => {
          delete el.dataset.revealPending;
          clearAnim(el);
        });
    };

    const setup = () => {
      teardown();
      if (reduce.matches) return;

      tracked = Array.from(
        document.querySelectorAll<HTMLElement>("[data-reveal]"),
      );
      // Starting state, without animation: shown if it is in the show zone
      // (on screen at load), hidden otherwise.
      const z = zones();
      for (const el of tracked) {
        const r = box(el);
        if (r.height === 0) continue;
        if (!inShowZone(r, z)) el.dataset.revealPending = sideOf(r);
      }

      window.addEventListener("scroll", schedule, { passive: true });
      // Resize also covers display:none copies becoming visible.
      window.addEventListener("resize", schedule);
    };

    setup();
    reduce.addEventListener("change", setup);
    return () => {
      reduce.removeEventListener("change", setup);
      teardown();
    };
  }, []);

  return null;
}

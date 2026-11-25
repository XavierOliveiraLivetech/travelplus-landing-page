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
const IN_MS = 1100;
/** Longest transition + max stagger, with room to spare. */
const ANIM_CLEANUP_MS = 1900;

/**
 * Natural-scroll reveals on every screen size: elements marked `data-reveal`
 * fade in and rise a little as they come into view — once. After that they
 * stay visible regardless of scroll direction.
 *
 * - Content is never removed from the layout (no shifts while reading) and
 *   anything already on screen at load stays visible.
 * - Each element fades in on its own once its top edge is a quarter of the
 *   way up the viewport, so tall stacks (pricing cards on a short phone)
 *   can't stay hidden.
 * - Items that enter in the same scroll step get a short stagger.
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

    const show = (el: HTMLElement, delay: number) => {
      window.clearTimeout(timers.get(el));
      el.style.setProperty("--reveal-delay", `${delay}ms`);
      el.style.setProperty("--reveal-dur", `${IN_MS}ms`);
      el.dataset.revealAnim = "";
      delete el.dataset.revealPending;
      timers.set(
        el,
        window.setTimeout(() => {
          timers.delete(el);
          clearAnim(el);
        }, ANIM_CLEANUP_MS + delay),
      );
    };

    let tracked: HTMLElement[] = [];
    let frame = 0;

    const zones = () => {
      const vh = window.innerHeight;
      return {
        trigger: vh * (1 - TRIGGER_FROM_BOTTOM),
        topBand: vh * 0.08,
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
    /**
     * Items sharing a `data-reveal-group` value enter as one block: they use
     * the union of their boxes, so they all reveal in the same step (staggered
     * top-to-bottom, then left-to-right) instead of one at a time.
     */
    const triggerBox = (el: HTMLElement): Box => {
      const own = box(el);
      const group = el.dataset.revealGroup;
      if (!group) return own;
      const members = document.querySelectorAll<HTMLElement>(
        `[data-reveal-group="${CSS.escape(group)}"]`,
      );
      let top = Infinity;
      let bottom = -Infinity;
      for (const m of members) {
        const r = box(m);
        if (r.height === 0) continue;
        top = Math.min(top, r.top);
        bottom = Math.max(bottom, r.bottom);
      }
      if (top === Infinity || own.height === 0) return own;
      return { top, bottom, left: own.left, height: bottom - top };
    };
    const inShowZone = (r: Box, z: ReturnType<typeof zones>) =>
      r.top < z.trigger && r.bottom > z.topBand;
    /** Which edge a hidden item sits beyond (by its middle). */
    const sideOf = (r: Box): Side =>
      r.top + r.height / 2 < window.innerHeight / 2 ? "top" : "bottom";

    const update = () => {
      frame = 0;
      const z = zones();
      const entering: { el: HTMLElement; r: Box }[] = [];
      const stillPending: HTMLElement[] = [];
      for (const el of tracked) {
        const r = triggerBox(el);
        if (r.height === 0) {
          // display:none copy — keep watching until it becomes measurable.
          stillPending.push(el);
          continue;
        }
        if (inShowZone(r, z)) entering.push({ el, r });
        else stillPending.push(el);
      }
      entering
        .sort((a, b) => a.r.top - b.r.top || a.r.left - b.r.left)
        .forEach(({ el }, step) =>
          show(el, Math.min(step, MAX_STAGGER_STEPS) * STAGGER_MS),
        );
      // Drop revealed items so they never re-hide on later scrolls.
      tracked = stillPending;
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

      const all = Array.from(
        document.querySelectorAll<HTMLElement>("[data-reveal]"),
      );
      // Starting state, without animation: shown if it is in the show zone
      // (on screen at load), hidden otherwise — and only those stay tracked.
      const z = zones();
      tracked = [];
      for (const el of all) {
        const r = triggerBox(el);
        if (r.height === 0) {
          el.dataset.revealPending = "bottom";
          tracked.push(el);
          continue;
        }
        if (!inShowZone(r, z)) {
          el.dataset.revealPending = sideOf(r);
          tracked.push(el);
        }
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

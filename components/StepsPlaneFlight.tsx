"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import styles from "./StepsPlaneFlight.module.css";

const StoryAirliner = dynamic(
  () => import("./StoryAirliner").then((mod) => mod.StoryAirliner),
  { ssr: false },
);

gsap.registerPlugin(useGSAP);

/** Wide layout (the three-card row) with full motion. */
const FLIGHT_QUERY =
  "(min-width: 1024px) and (prefers-reduced-motion: no-preference)";

/**
 * One left-to-right pass over the cards, on its own clock. Even pace: the
 * plane starts and ends off screen, so an ease-in-out only made it rush
 * across the cards (the middle) where it should be easiest to follow.
 */
const FLIGHT_S = 4.5;
const FLIGHT_EASE = "none";
/**
 * Share of the flight area that must be on screen before the plane takes
 * off (1 = all of it). Below 1 so it starts while the section scrolls in.
 */
const VISIBLE_RATIO = 0.7;
/**
 * The cards fade out once the area is within this share of a screen edge
 * (same band as ScrollReveal), and the flight replays on the next visit.
 */
const LEAVE_EDGE = 0.08;
const LEAVE_S = 0.65;

type Pt = { x: number; y: number };
type Cubic = [Pt, Pt, Pt, Pt];

/**
 * Steps flight, traced from the design reference. Coordinates are in
 * "card space": u = 0 → left edge of the first step card, u = 1 → right
 * edge of the last card; v = 0 → top of the cards, v = 1 → bottom.
 * Anchoring to the cards (not the viewport) keeps the line crossing the
 * same spots at any screen size.
 */
const STEPS_ROUTE: Pt[] = [
  { x: -0.24, y: -1.06 }, // off-screen, top-left
  { x: -0.05, y: -0.14 }, // diving towards the first card
  { x: 0.14, y: 0.35 }, // across "Entry"
  { x: 0.31, y: 0.49 }, // levelling out
  { x: 0.46, y: 0.49 }, // flat under the setup card's logo
  { x: 0.63, y: 0.76 }, // dipping through the second card
  { x: 0.74, y: 0.83 },
  { x: 0.91, y: 0.83 }, // flat across the booking card
  { x: 1.09, y: 0.66 }, // climbing out
  { x: 1.32, y: 0.48 }, // off-screen, right
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** Catmull-Rom-style smoothing through `points` as cubic segments. */
function smoothThrough(points: Pt[], tension = 0.44): Cubic[] {
  const segments: Cubic[] = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    segments.push([
      p1,
      {
        x: p1.x + ((p2.x - p0.x) * tension) / 3,
        y: p1.y + ((p2.y - p0.y) * tension) / 3,
      },
      {
        x: p2.x - ((p3.x - p1.x) * tension) / 3,
        y: p2.y - ((p3.y - p1.y) * tension) / 3,
      },
      p2,
    ]);
  }
  return segments;
}

type PathSampler = { length: number; pointAt: (distance: number) => Pt };

/** Arc-length lookup table, so the plane moves at an even speed. */
function createPathSampler(segments: Cubic[], stepsPerSegment = 64): PathSampler {
  const count = segments.length * stepsPerSegment + 1;
  const xs = new Float64Array(count);
  const ys = new Float64Array(count);
  const lens = new Float64Array(count);
  let k = 0;
  for (let s = 0; s < segments.length; s += 1) {
    const [p0, p1, p2, p3] = segments[s];
    for (let i = s === 0 ? 0 : 1; i <= stepsPerSegment; i += 1) {
      const t = i / stepsPerSegment;
      const mt = 1 - t;
      const a = mt * mt * mt;
      const b = 3 * mt * mt * t;
      const c = 3 * mt * t * t;
      const d = t * t * t;
      xs[k] = a * p0.x + b * p1.x + c * p2.x + d * p3.x;
      ys[k] = a * p0.y + b * p1.y + c * p2.y + d * p3.y;
      lens[k] =
        k === 0 ? 0 : lens[k - 1] + Math.hypot(xs[k] - xs[k - 1], ys[k] - ys[k - 1]);
      k += 1;
    }
  }
  const last = k - 1;
  const length = last > 0 ? lens[last] : 0;

  const pointAt = (distance: number): Pt => {
    if (last <= 0) return { x: xs[0] ?? 0, y: ys[0] ?? 0 };
    const target = clamp(distance, 0, length);
    let lo = 0;
    let hi = last;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (lens[mid] < target) lo = mid;
      else hi = mid;
    }
    const span = lens[hi] - lens[lo];
    const t = span > 0 ? (target - lens[lo]) / span : 0;
    return {
      x: xs[lo] + (xs[hi] - xs[lo]) * t,
      y: ys[lo] + (ys[hi] - ys[lo]) * t,
    };
  };

  return { length, pointAt };
}

/** Offset of `el` inside `ancestor`, ignoring CSS transforms. */
function layoutOffset(el: HTMLElement, ancestor: HTMLElement) {
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = el;
  while (node && node !== ancestor) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return node === ancestor ? { x, y } : null;
}

/** Bottom edge of the fixed site header (0 if there is none). */
function headerBottom() {
  const header = document.querySelector<HTMLElement>("[data-site-header]");
  return header ? Math.max(0, header.getBoundingClientRect().bottom) : 0;
}

/**
 * "Como funciona" plane: once the whole flight area is on screen it crosses
 * the three step cards left to right on its own clock, revealing each card
 * as its nose reaches it. It plays on every visit: when the area scrolls off
 * screen (either way) the cards fade out, and coming back replays it.
 *
 * Render it as a direct child of the positioned section (the plane flies in
 * its coordinates); the space that must be fully on screen is the element
 * marked `data-steps-flight-area` inside it.
 *
 * Step items carry `data-reveal-gate`; `data-revealed="true"` is set as the
 * plane uncovers them so their own demos (useSectionActive) wait for it.
 */
export function StepsPlaneFlight() {
  const layerRef = useRef<HTMLDivElement | null>(null);
  const planeRef = useRef<HTMLDivElement | null>(null);
  // three.js only loads where the flight actually runs.
  const [planeMounted, setPlaneMounted] = useState(false);

  useGSAP(() => {
    // Parent refs are not attached yet when this layout effect runs, so
    // find the section and the flight area from the layer itself.
    const plane = planeRef.current;
    const root = layerRef.current?.parentElement;
    const area = root?.querySelector<HTMLElement>("[data-steps-flight-area]");
    if (!root || !area || !plane) return;

    const items = () =>
      Array.from(area.querySelectorAll<HTMLElement>("[data-step-item]"));

    /**
     * +1 while the cards are hidden below (they rise in), -1 once they left
     * through the top (scrolling back up, they come down in) — like the
     * page's other reveals.
     */
    let side = 1;

    const paintItem = (item: HTMLElement, amount: number) => {
      gsap.set(item, {
        opacity: amount,
        y: (1 - amount) * 14 * side,
        filter: amount > 0.9 ? "none" : `blur(${(1 - amount) * 4}px)`,
      });
      const revealed = amount > 0.6 ? "true" : "false";
      if (item.dataset.revealed !== revealed) item.dataset.revealed = revealed;
    };

    const showAll = () => {
      for (const item of items()) {
        gsap.set(item, { clearProps: "opacity,transform,filter" });
        item.dataset.revealed = "true";
      }
      plane.style.opacity = "0";
    };

    const mm = gsap.matchMedia();
    mm.add(FLIGHT_QUERY, () => {
      setPlaneMounted(true);

      let sampler: PathSampler | null = null;
      const flight = { progress: 0 };
      let state: "idle" | "playing" | "done" = "idle";
      let tween: gsap.core.Tween | null = null;

      const measure = () => {
        const cards = Array.from(
          area.querySelectorAll<HTMLElement>("[data-step-card]"),
        ).filter((card) => card.offsetWidth > 0);
        const w = root.offsetWidth;
        if (cards.length === 0 || w < 40) {
          sampler = null;
          return;
        }
        const first = layoutOffset(cards[0], root);
        const lastCard = cards[cards.length - 1];
        const last = layoutOffset(lastCard, root);
        if (!first || !last) {
          sampler = null;
          return;
        }
        const left = first.x;
        const span = last.x + lastCard.offsetWidth - left;
        const height = cards[0].offsetHeight;
        const route = STEPS_ROUTE.map((u) => ({
          x: left + u.x * span,
          y: first.y + u.y * height,
        }));
        // Start and finish fully outside the section.
        const planeW = plane.offsetWidth || 260;
        route[0].x = Math.min(route[0].x, -planeW * 0.5);
        const end = route[route.length - 1];
        end.x = Math.max(end.x, w + planeW * 0.8);
        sampler = createPathSampler(smoothThrough(route));
      };

      const itemLefts = () =>
        items().map((item) => {
          const offset = layoutOffset(item, root);
          return { item, left: offset?.x ?? 0, width: item.offsetWidth };
        });

      const placePlane = () => {
        if (!sampler || sampler.length <= 0) {
          plane.style.opacity = "0";
          return;
        }
        const distance = flight.progress * sampler.length;
        const point = sampler.pointAt(distance);
        const ahead = sampler.pointAt(distance + 10);
        const behind = sampler.pointAt(distance - 10);
        const dx = ahead.x - behind.x;
        const dy = ahead.y - behind.y;
        const tilt = (Math.atan2(dy, dx) * 180) / Math.PI;
        plane.style.opacity =
          state === "playing" && flight.progress > 0 && flight.progress < 1
            ? "1"
            : "0";
        plane.style.transform = `translate(${point.x}px, ${point.y}px) translate(-65%, -50%) rotate(${tilt}deg)`;

        // Reveal each card as the nose crosses it.
        for (const { item, left, width } of itemLefts()) {
          const revealAt = left + width * 0.12;
          const spread = Math.max(48, width * 0.5);
          paintItem(item, clamp((point.x - revealAt) / spread, 0, 1));
        }
      };

      /** Stops the flight and hides the plane, ready for the next take-off. */
      const stop = () => {
        tween?.kill();
        tween = null;
        state = "idle";
        flight.progress = 0;
        plane.style.opacity = "0";
      };

      const arm = () => {
        stop();
        for (const item of items()) paintItem(item, 0);
      };

      /** Leaving the screen: fade the cards out and wait for the next visit. */
      const leave = (edge: "top" | "bottom") => {
        stop();
        side = edge === "top" ? -1 : 1;
        const list = items();
        for (const item of list) item.dataset.revealed = "false";
        gsap.to(list, {
          opacity: 0,
          y: 14 * side,
          duration: LEAVE_S,
          ease: "power1.in",
          overwrite: true,
        });
      };

      const finish = () => {
        tween = null;
        state = "done";
        plane.style.opacity = "0";
        for (const item of items()) paintItem(item, 1);
      };

      const play = () => {
        // A fade-out still running from a quick leave must not fight the flight.
        gsap.killTweensOf(items());
        measure();
        if (!sampler) {
          finish();
          return;
        }
        state = "playing";
        flight.progress = 0;
        tween = gsap.to(flight, {
          progress: 1,
          duration: FLIGHT_S,
          ease: FLIGHT_EASE,
          onUpdate: placePlane,
          onComplete: finish,
        });
      };

      /** Visible share of the area, against the room the viewport has. */
      const areaOnScreen = () => {
        const top = headerBottom();
        const bottom = window.innerHeight;
        const rect = area.getBoundingClientRect();
        const room = Math.max(1, bottom - top);
        const seen = Math.min(rect.bottom, bottom) - Math.max(rect.top, top);
        return Math.max(0, seen) / Math.min(rect.height || 1, room);
      };

      /** Nothing of the area is left outside the thin edge bands. */
      const areaLeaving = (): "top" | "bottom" | null => {
        const top = headerBottom();
        const band = window.innerHeight * LEAVE_EDGE;
        const rect = area.getBoundingClientRect();
        if (rect.bottom < top + band) return "top";
        if (rect.top > window.innerHeight - band) return "bottom";
        return null;
      };

      let frame = 0;
      const check = () => {
        frame = 0;
        const edge = areaLeaving();
        // Scrolled away (up or down): fade out so the next visit replays it.
        if (state !== "idle" && edge) {
          leave(edge);
          return;
        }
        // Idle off screen: face the edge it will come back through.
        if (state === "idle" && edge && side !== (edge === "top" ? -1 : 1)) {
          side = edge === "top" ? -1 : 1;
          gsap.killTweensOf(items());
          for (const item of items()) paintItem(item, 0);
          return;
        }
        if (state === "idle" && areaOnScreen() >= VISIBLE_RATIO) play();
      };
      const schedule = () => {
        if (!frame) frame = requestAnimationFrame(check);
      };

      let resizeFrame = 0;
      const onResize = () => {
        cancelAnimationFrame(resizeFrame);
        resizeFrame = requestAnimationFrame(() => {
          measure();
          if (state === "playing") placePlane();
          schedule();
        });
      };

      arm();
      schedule();

      window.addEventListener("scroll", schedule, { passive: true });
      window.addEventListener("resize", onResize);

      return () => {
        window.removeEventListener("scroll", schedule);
        window.removeEventListener("resize", onResize);
        cancelAnimationFrame(frame);
        cancelAnimationFrame(resizeFrame);
        tween?.kill();
        setPlaneMounted(false);
        plane.style.transform = "";
        showAll();
      };
    });

    // Narrow layouts and reduced motion: cards are simply shown.
    mm.add(`not all and ${FLIGHT_QUERY}`, () => {
      showAll();
    });

    return () => mm.revert();
  }, []);

  return (
    <div ref={layerRef} className={styles.layer} aria-hidden="true">
      <div ref={planeRef} className={styles.plane}>
        {planeMounted && <StoryAirliner />}
      </div>
    </div>
  );
}

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
 * The tilt follows the path direction measured this far ahead of and behind
 * the plane, as a share of its width. A window about the plane's own size
 * averages out small bends, so the body banks gently instead of twitching.
 */
const TILT_WINDOW = 0.4;

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

/**
 * Slopes of a natural cubic spline through `values` at each knot, with
 * knots spaced by `gaps` (tridiagonal solve, zero curvature at both ends).
 */
function naturalSlopes(values: number[], gaps: number[]): number[] {
  const n = values.length;
  const sub = new Float64Array(n);
  const diag = new Float64Array(n);
  const sup = new Float64Array(n);
  const rhs = new Float64Array(n);
  diag[0] = 1;
  diag[n - 1] = 1;
  for (let i = 1; i < n - 1; i += 1) {
    sub[i] = gaps[i - 1];
    diag[i] = 2 * (gaps[i - 1] + gaps[i]);
    sup[i] = gaps[i];
    rhs[i] =
      3 *
      ((values[i + 1] - values[i]) / gaps[i] -
        (values[i] - values[i - 1]) / gaps[i - 1]);
  }
  for (let i = 1; i < n; i += 1) {
    const m = sub[i] / diag[i - 1];
    diag[i] -= m * sup[i - 1];
    rhs[i] -= m * rhs[i - 1];
  }
  // Half second derivatives at each knot.
  const c = new Float64Array(n);
  c[n - 1] = rhs[n - 1] / diag[n - 1];
  for (let i = n - 2; i >= 0; i -= 1) {
    c[i] = (rhs[i] - sup[i] * c[i + 1]) / diag[i];
  }
  const slopes: number[] = [];
  for (let i = 0; i < n - 1; i += 1) {
    slopes.push(
      (values[i + 1] - values[i]) / gaps[i] - (gaps[i] * (2 * c[i] + c[i + 1])) / 3,
    );
  }
  const g = gaps[n - 2];
  slopes.push((values[n - 1] - values[n - 2]) / g + (g * (c[n - 2] + 2 * c[n - 1])) / 3);
  return slopes;
}

/**
 * Natural cubic spline through `points` (chord-length spacing) as Bézier
 * segments. Unlike Catmull-Rom, curvature stays continuous at every point,
 * so the plane's turn rate never jumps where two segments meet.
 */
function smoothThrough(points: Pt[]): Cubic[] {
  if (points.length < 2) return [];
  const gaps: number[] = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    gaps.push(
      Math.max(
        1e-6,
        Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y),
      ),
    );
  }
  const dx = naturalSlopes(points.map((p) => p.x), gaps);
  const dy = naturalSlopes(points.map((p) => p.y), gaps);
  const segments: Cubic[] = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const h = gaps[i] / 3;
    segments.push([
      p1,
      { x: p1.x + dx[i] * h, y: p1.y + dy[i] * h },
      { x: p2.x - dx[i + 1] * h, y: p2.y - dy[i + 1] * h },
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
 * "Como funciona" plane: once the flight area is on screen it crosses the
 * three step cards left to right on its own clock, revealing each card as
 * its nose reaches it. One-shot: after the pass, the cards stay visible
 * and scrolling away never hides them or replays the flight.
 *
 * Render it as a direct child of the positioned section (the plane flies in
 * its coordinates); the space that must be on screen is the element marked
 * `data-steps-flight-area` inside it.
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

    const paintItem = (item: HTMLElement, amount: number) => {
      gsap.set(item, {
        opacity: amount,
        y: (1 - amount) * 14,
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
      let tiltReach = 100;
      // Card positions, measured with the path instead of on every frame.
      let itemBoxes: { item: HTMLElement; left: number; width: number }[] = [];
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
        tiltReach = planeW * TILT_WINDOW;
        itemBoxes = items().map((item) => {
          const offset = layoutOffset(item, root);
          return { item, left: offset?.x ?? 0, width: item.offsetWidth };
        });
      };

      const placePlane = () => {
        if (!sampler || sampler.length <= 0) {
          plane.style.opacity = "0";
          return;
        }
        const distance = flight.progress * sampler.length;
        const point = sampler.pointAt(distance);
        const ahead = sampler.pointAt(distance + tiltReach);
        const behind = sampler.pointAt(distance - tiltReach);
        const dx = ahead.x - behind.x;
        const dy = ahead.y - behind.y;
        const tilt = (Math.atan2(dy, dx) * 180) / Math.PI;
        plane.style.opacity =
          state === "playing" && flight.progress > 0 && flight.progress < 1
            ? "1"
            : "0";
        plane.style.transform = `translate(${point.x}px, ${point.y}px) translate(-65%, -50%) rotate(${tilt}deg)`;

        // Reveal each card as the nose crosses it.
        for (const { item, left, width } of itemBoxes) {
          const revealAt = left + width * 0.12;
          const spread = Math.max(48, width * 0.5);
          paintItem(item, clamp((point.x - revealAt) / spread, 0, 1));
        }
      };

      const finish = () => {
        tween = null;
        state = "done";
        plane.style.opacity = "0";
        // Clear inline reveal styles so the cards stay fully visible.
        showAll();
        window.removeEventListener("scroll", schedule);
      };

      const play = () => {
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

      let frame = 0;
      const check = () => {
        frame = 0;
        if (state === "idle" && areaOnScreen() >= VISIBLE_RATIO) play();
      };
      const schedule = () => {
        if (state === "done") return;
        if (!frame) frame = requestAnimationFrame(check);
      };

      let resizeFrame = 0;
      const onResize = () => {
        cancelAnimationFrame(resizeFrame);
        resizeFrame = requestAnimationFrame(() => {
          if (state === "done") return;
          measure();
          if (state === "playing") placePlane();
          schedule();
        });
      };

      for (const item of items()) paintItem(item, 0);
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

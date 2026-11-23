"use client";

import {
  claimPageScroll,
  lockPageSnapBriefly,
  releasePageScroll,
} from "@/lib/pageScrollClaim";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import dynamic from "next/dynamic";
import {
  Children,
  type ReactNode,
  isValidElement,
  useRef,
  useState,
} from "react";
import { STORY_POINTER_QUERY } from "@/lib/motionQueries";
import styles from "./PaperPlaneFlight.module.css";

const StoryAirliner = dynamic(
  () => import("./StoryAirliner").then((mod) => mod.StoryAirliner),
  { ssr: false },
);

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin, useGSAP);

const STORY_OWNER = "scrollytelling" as const;
/** Must match ScrollTrigger `scrub` — restored after arrow glides. */
const STORY_SCRUB = 0.6;
const PANEL_KEYS = [
  "hero",
  "problems",
  "features",
  "skills",
  "pricing",
  "closing",
] as const;
type PanelKey = (typeof PANEL_KEYS)[number];

/**
 * Arrow-button glide, in seconds per timeline unit.
 * One click crosses a whole section (fade out, plane, fade in, reveals).
 * Kept close to the timeline so section animations still read clearly;
 * ease (not duration) is what makes the click feel instant.
 */
const NAV_GLIDE_MIN_S = 2.2;
const NAV_GLIDE_MAX_S = 12;
const NAV_GLIDE_S_PER_UNIT = 0.95;

/**
 * Section-to-section auto-complete (desktop story).
 * Scrolling drives the story freely; once the user has scrolled
 * STEP_TRIGGER_FRACTION of the distance to the next/previous section (capped
 * at STEP_TRIGGER_MAX_PX), the rest of the transition plays automatically.
 */
const STEP_TRIGGER_FRACTION = 0.15;
const STEP_TRIGGER_MAX_PX = 200;
/**
 * Section transitions are paced by how much story they cross (fade out,
 * plane leg, fade in, staggered reveals), in seconds per timeline unit, so
 * every fade stays readable. A flat duration squeezed long sections.
 */
const STEP_S_PER_UNIT = 0.8;
/**
 * Bounds for one section step. Scroll auto-complete, arrow buttons and keys
 * all use the same duration and ease, so every transition feels the same.
 */
const STEP_GLIDE_MIN_S = 1.6;
const STEP_GLIDE_MAX_S = 3.2;
/**
 * Extra time for the step that carries the plane across the "Como funciona"
 * cards, so the flight (and the cards it reveals) reads more calmly.
 */
const STEPS_FLIGHT_SLOW = 1.4;
/** Even pace: fade-out and fade-in both get their time. */
const STEP_EASE = "sine.inOut";
/** Stopped short of the trigger: glide back to the current section. */
const SNAP_BACK_S = 0.45;
/** Scroll silence after which a short, unfinished scroll settles back. */
const SETTLE_IDLE_MS = 350;
/** Wheel silence that ends a gesture (trackpad inertia keeps firing). */
const GESTURE_GAP_MS = 180;

const LEG = 1;
const PATH_LEGS = 7;
/** Hero hold + hierarchical exit before the plane story. */
const HERO_SEG = 1.2;
/** Extra beat after the plane finishes so all pricing tickets are in view. */
const PRICING_SETTLE = 0.25;
/** CTA/Footer hierarchical enter. */
const CLOSING_SEG = 1.45;
/**
 * Extra scroll (timeline units) with the problems section fully shown —
 * it used to start leaving the moment it finished entering. The plane keeps
 * flying through it, just slower.
 */
const PROBLEMS_HOLD = 0.6;
const MID = HERO_SEG;
const TOTAL = HERO_SEG + PATH_LEGS + PRICING_SETTLE + CLOSING_SEG;

/** Scroll progress (0–1 through the pin) for deep-link seeks. */
const SEEK_PROGRESS: Record<PanelKey, number> = {
  hero: 0.02,
  problems: (MID + 0.2) / TOTAL,
  features: (MID + 2.05) / TOTAL,
  skills: (MID + 4.05) / TOTAL,
  pricing: (MID + 6.15) / TOTAL,
  closing: (MID + PATH_LEGS + PRICING_SETTLE + 0.5) / TOTAL,
};

const LAYER_ENTER = {
  opacity: 0,
  y: 18,
  filter: "blur(6px)",
} as const;

const LAYER_SHOWN = {
  opacity: 1,
  y: 0,
  filter: "blur(0px)",
} as const;

const LAYER_EXIT = {
  opacity: 0,
  y: -8,
  filter: "blur(4px)",
} as const;

type Props = {
  children: ReactNode;
};

type Pt = { x: number; y: number };

/**
 * Continuous zig-zag inspired by Michelle Barker’s Weird Fishes path:
 * L→R enter, R→L exit, repeated — varied altitudes so the plane never
 * rides the same rail twice.
 */
const FLIGHT_WAYPOINTS: Pt[] = [
  // Problems enter L→R
  { x: -0.1, y: 0.52 },
  { x: 0.16, y: 0.3 },
  { x: 0.4, y: 0.58 },
  { x: 0.66, y: 0.26 },
  { x: 1.08, y: 0.44 },
  // Problems exit R→L
  { x: 0.9, y: 0.6 },
  { x: 0.58, y: 0.34 },
  { x: 0.28, y: 0.64 },
  { x: -0.1, y: 0.4 },
  // Features enter L→R
  { x: -0.08, y: 0.46 },
  { x: 0.18, y: 0.7 },
  { x: 0.46, y: 0.28 },
  { x: 0.74, y: 0.56 },
  { x: 1.1, y: 0.34 },
  // Features exit R→L
  { x: 0.92, y: 0.48 },
  { x: 0.6, y: 0.72 },
  { x: 0.3, y: 0.32 },
  { x: -0.1, y: 0.56 },
  // Skills enter L→R
  { x: -0.08, y: 0.38 },
  { x: 0.22, y: 0.62 },
  { x: 0.5, y: 0.26 },
  { x: 0.76, y: 0.5 },
  { x: 1.08, y: 0.4 },
  // Skills exit R→L
  { x: 0.88, y: 0.58 },
  { x: 0.55, y: 0.3 },
  { x: 0.25, y: 0.66 },
  { x: -0.1, y: 0.44 },
  // Pricing enter L→R (+ soft settle)
  { x: -0.08, y: 0.5 },
  { x: 0.2, y: 0.28 },
  { x: 0.48, y: 0.62 },
  { x: 0.72, y: 0.34 },
  { x: 0.94, y: 0.48 },
];

/** Index range of the "Skills enter L→R" leg inside FLIGHT_WAYPOINTS. */
const SKILLS_ENTER_FROM = 18;
const SKILLS_ENTER_COUNT = 5;

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

/** Card row used to anchor STEPS_ROUTE, in pin pixels. */
type StepsAnchor = { left: number; right: number; top: number; height: number };

/**
 * ScrollTrigger#scrubDuration exists at runtime (GSAP 3.12+) but is missing
 * from GSAP's type definitions.
 */
function setScrubDuration(trigger: ScrollTrigger, seconds: number) {
  (trigger as ScrollTrigger & { scrubDuration(value: number): void })
    .scrubDuration(seconds);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** One cubic Bézier segment: start, control 1, control 2, end. */
type Cubic = [Pt, Pt, Pt, Pt];

/** Catmull-Rom-style smoothing through `points` as cubic segments. */
function smoothThrough(points: Pt[], tension = 0.45): Cubic[] {
  const segments: Cubic[] = [];
  if (points.length < 2) return segments;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const cp1: Pt = {
      x: p1.x + ((p2.x - p0.x) * tension) / 3,
      y: p1.y + ((p2.y - p0.y) * tension) / 3,
    };
    const cp2: Pt = {
      x: p2.x - ((p3.x - p1.x) * tension) / 3,
      y: p2.y - ((p3.y - p1.y) * tension) / 3,
    };
    segments.push([p1, cp1, cp2, p2]);
  }
  return segments;
}

type PathSampler = { length: number; pointAt: (distance: number) => Pt };

/**
 * Arc-length lookup table for the flight path, built once per measure.
 * SVGPathElement.getPointAtLength re-walks the whole path on every call
 * (~1ms each for this route in Chrome); the story asks for hundreds of
 * points on mount/refresh and three per scroll frame, which froze the page
 * (and the route slide transition) for over a second.
 */
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
      lens[k] = k === 0 ? 0 : lens[k - 1] + Math.hypot(xs[k] - xs[k - 1], ys[k] - ys[k - 1]);
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

function buildFlightPath(
  width: number,
  height: number,
  steps: StepsAnchor | null,
): Cubic[] {
  if (width < 40 || height < 80) return [];
  const points = FLIGHT_WAYPOINTS.map((u) => ({
    x: u.x * width,
    y: u.y * height,
  }));

  if (steps && steps.right - steps.left > 40 && steps.height > 20) {
    const span = steps.right - steps.left;
    const route = STEPS_ROUTE.map((u) => ({
      x: steps.left + u.x * span,
      y: steps.top + u.y * steps.height,
    }));
    // Start and finish fully off-screen so the plane enters and leaves cleanly.
    route[0].x = Math.min(route[0].x, -0.08 * width);
    const last = route[route.length - 1];
    last.x = Math.max(last.x, 1.08 * width);
    points.splice(SKILLS_ENTER_FROM, SKILLS_ENTER_COUNT, ...route);
  }

  return smoothThrough(points, 0.44);
}

/** Offset of `el` inside `ancestor`, ignoring CSS transforms (GSAP y/blur). */
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

function measureStepsAnchor(pin: HTMLElement): StepsAnchor | null {
  const cards = Array.from(
    pin.querySelectorAll<HTMLElement>("[data-step-item] [data-step-card]"),
  ).filter((card) => card.offsetWidth > 0);
  if (cards.length === 0) return null;
  const first = layoutOffset(cards[0], pin);
  const lastCard = cards[cards.length - 1];
  const last = layoutOffset(lastCard, pin);
  if (!first || !last) return null;
  return {
    left: first.x,
    right: last.x + lastCard.offsetWidth,
    top: first.y,
    height: cards[0].offsetHeight,
  };
}

function panelKeyFromTarget(id: string | undefined): PanelKey | null {
  if (!id) return null;
  if (id === "inicio" || id === "hero") return "hero";
  if (id === "produto" || id === "problems" || id === "story") {
    return "problems";
  }
  if (id === "produto-features" || id === "features") return "features";
  if (id === "como-funciona" || id === "skills") return "skills";
  if (id === "planos" || id === "pricing") return "pricing";
  if (id === "contacto" || id === "closing") return "closing";
  return null;
}

function activePanelFromProgress(progress: number): PanelKey {
  const marks: Array<[PanelKey, number]> = [
    ["hero", SEEK_PROGRESS.hero],
    ["problems", SEEK_PROGRESS.problems],
    ["features", SEEK_PROGRESS.features],
    ["skills", SEEK_PROGRESS.skills],
    ["pricing", SEEK_PROGRESS.pricing],
    ["closing", SEEK_PROGRESS.closing],
  ];
  // Latest panel whose seek mark we've reached (with a small lead-in).
  for (let i = marks.length - 1; i >= 0; i -= 1) {
    const [key, mark] = marks[i];
    if (progress >= mark - 0.02) return key;
  }
  return "hero";
}

function layersOf(root: HTMLElement, name: string) {
  return Array.from(
    root.querySelectorAll<HTMLElement>(`[data-story-layer="${name}"]`),
  );
}

export function PaperPlaneFlight({ children }: Props) {
  const bridgeRef = useRef<HTMLDivElement | null>(null);
  const pinRef = useRef<HTMLDivElement | null>(null);
  const planeRef = useRef<HTMLDivElement | null>(null);
  const panelRefs = useRef<Array<HTMLDivElement | null>>([]);
  // The 3D plane only exists for the desktop story. On phones, tablets and
  // with reduced motion its layer is display:none, but a mounted <Canvas>
  // would still load three.js and render every frame in the background.
  const [planeMounted, setPlaneMounted] = useState(false);

  const childList = Children.toArray(children).filter(isValidElement);

  useGSAP(
    () => {
      const bridge = bridgeRef.current;
      const pin = pinRef.current;
      const plane = planeRef.current;
      const panels = PANEL_KEYS.map((_, i) => panelRefs.current[i]).filter(
        Boolean,
      ) as HTMLElement[];

      if (!bridge || !pin || !plane || panels.length < PANEL_KEYS.length) {
        return;
      }

      let pathLength = 0;
      let sampler: PathSampler | null = null;
      const pointAt = (distance: number): Pt =>
        sampler ? sampler.pointAt(distance) : { x: 0, y: 0 };
      let activeTrigger: ScrollTrigger | null = null;
      // Steps only show the left-to-right pass: hidden before it turns
      // right, and hidden again once that pass turns back toward the left.
      let stepsVisibleFrom = 0;
      let stepsVisibleUntil = 1;
      /** Nose follows scroll: 1 = scrubbing forward, -1 = scrubbing back. */
      let planeTravelDir: 1 | -1 = 1;
      let lastPlaneProgress = 0;

      // The story items never remount, but placePlane runs several times per
      // scroll frame: query + sort each list once and reuse it while every
      // cached node is still in the document.
      const itemCache = new Map<string, HTMLElement[]>();
      const sortedItems = (selector: string) => {
        const cached = itemCache.get(selector);
        if (cached?.length && cached.every((el) => el.isConnected)) return cached;
        const items = Array.from(
          bridge.querySelectorAll<HTMLElement>(selector),
        ).sort(
          (a, b) =>
            Number(a.dataset.flightIndex ?? 0) -
            Number(b.dataset.flightIndex ?? 0),
        );
        itemCache.set(selector, items);
        return items;
      };

      const setItemsVisible = (selector: string, visible: boolean) => {
        gsap.set(sortedItems(selector), {
          opacity: visible ? 1 : 0,
          y: visible ? 0 : 14,
          filter: visible ? "none" : "blur(4px)",
        });
      };

      /**
       * Reveal each item as the plane’s X crosses it (L→R).
       * Same path for features, steps, and pricing cards.
       * Scrubbing back (R→L) naturally hides them in reverse.
       */
      const updateItemRevealsByPlaneX = (
        selector: string,
        planeX: number,
        panelOpacity: number,
      ) => {
        const items = sortedItems(selector);
        if (items.length === 0) return;

        if (panelOpacity < 0.08) {
          gsap.set(items, {
            opacity: 0,
            y: 14,
            filter: "blur(4px)",
          });
          return;
        }

        // Read every rect first, then write: interleaving getBoundingClientRect
        // with style writes forced a layout per item on every frame.
        const pinLeft = pin.getBoundingClientRect().left;
        const rects = items.map((item) => item.getBoundingClientRect());
        items.forEach((item, i) => {
          const rect = rects[i];
          if (rect.width < 8) return;
          const itemLeft = rect.left - pinLeft;
          // Reveal as the nose reaches the column (slightly earlier for wider steps).
          const revealAt = itemLeft + rect.width * 0.12;
          const span = Math.max(48, rect.width * 0.5);
          const amount = clamp((planeX - revealAt) / span, 0, 1);
          gsap.set(item, {
            opacity: amount,
            y: (1 - amount) * 14,
            filter: amount > 0.9 ? "none" : `blur(${(1 - amount) * 4}px)`,
          });
        });
      };

      const placePlane = (progress: number) => {
        if (pathLength <= 0) {
          plane.style.opacity = "0";
          return;
        }
        const p = clamp(progress, 0, 1);
        // Face the way the plane is actually moving (scroll up reverses it).
        if (Math.abs(p - lastPlaneProgress) > 0.0004) {
          planeTravelDir = p >= lastPlaneProgress ? 1 : -1;
          lastPlaneProgress = p;
        }
        const distance = p * pathLength;
        const point = pointAt(distance);
        const look = 10;
        const probeAt = clamp(
          distance + look * planeTravelDir,
          0,
          pathLength,
        );
        const fallbackAt = clamp(
          distance - look * planeTravelDir,
          0,
          pathLength,
        );
        const probe = pointAt(probeAt);
        const fallback = pointAt(fallbackAt);
        const useProbe = Math.abs(probeAt - distance) > 0.5;
        const dx = useProbe ? probe.x - point.x : point.x - fallback.x;
        const dy = useProbe ? probe.y - point.y : point.y - fallback.y;
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        // A full turn to face left flips the plane upside down.
        // Mirror it instead, and only tilt by the path's pitch.
        const returning = dx < 0;
        const tilt = returning ? angle - 180 : angle;
        const facing = returning ? -1 : 1;

        const skillsPanel = panels[3];
        const skillsOpacity = skillsPanel
          ? Number(gsap.getProperty(skillsPanel, "opacity"))
          : 0;
        const flyingSteps = skillsOpacity > 0.08;
        const beforeEntrance = flyingSteps && p < stepsVisibleFrom;
        // Hide once the L→R pass is done (or the nose is past the viewport),
        // so nav stops never leave the airliner parked on the right edge.
        const pastExit = p >= stepsVisibleUntil - 0.0005;
        const offRight = point.x > pin.offsetWidth * 1.02;
        const offLeft = point.x < -0.12 * pin.offsetWidth;
        const afterExit = flyingSteps && (pastExit || offRight);

        if (!flyingSteps || beforeEntrance || afterExit || offLeft) {
          plane.style.opacity = "0";
        } else {
          plane.style.opacity = String(skillsOpacity);
          plane.style.transform = `translate(${point.x}px, ${point.y}px) translate(-65%, -50%) rotate(${tilt}deg) scaleX(${facing})`;
        }
        const pastStepsFlight = pastExit || offRight;
        if (skillsPanel) {
          updateItemRevealsByPlaneX(
            "[data-step-item]",
            pastStepsFlight ? pin.offsetWidth + 120 : point.x,
            beforeEntrance ? 0 : skillsOpacity,
          );
        }
      };

      const measurePath = () => {
        const w = pin.offsetWidth;
        const h = pin.offsetHeight;
        if (w < 40 || h < 40) return false;

        const segments = buildFlightPath(w, h, measureStepsAnchor(pin));
        if (segments.length === 0) return false;

        sampler = createPathSampler(segments);
        pathLength = sampler.length;
        return pathLength > 0;
      };

      const [hero, problems, features, skills, pricing, closing] = panels;

      const heroLayers = {
        bg: layersOf(hero, "hero-bg"),
        title: layersOf(hero, "hero-title"),
        copy: layersOf(hero, "hero-copy"),
        actions: layersOf(hero, "hero-actions"),
      };

      const closingLayers = {
        ctaBg: layersOf(closing, "cta-bg"),
        ctaTitle: layersOf(closing, "cta-title"),
        ctaCopy: layersOf(closing, "cta-copy"),
        ctaActions: layersOf(closing, "cta-actions"),
        footerBg: layersOf(closing, "footer-bg"),
        footerContent: layersOf(closing, "footer-content"),
      };

      const allHeroLayers = [
        ...heroLayers.bg,
        ...heroLayers.title,
        ...heroLayers.copy,
        ...heroLayers.actions,
      ];

      const allClosingLayers = [
        ...closingLayers.ctaBg,
        ...closingLayers.ctaTitle,
        ...closingLayers.ctaCopy,
        ...closingLayers.ctaActions,
        ...closingLayers.footerBg,
        ...closingLayers.footerContent,
      ];

      const showAllPanels = () => {
        gsap.set(panels, {
          opacity: 1,
          y: 0,
          filter: "none",
          pointerEvents: "auto",
        });
        gsap.set(allHeroLayers, LAYER_SHOWN);
        gsap.set(allClosingLayers, LAYER_SHOWN);
        setItemsVisible("[data-feature-item]", true);
        setItemsVisible("[data-step-item]", true);
        setItemsVisible("[data-pricing-shell]", true);
        setItemsVisible("[data-pricing-item]", true);
        plane.style.opacity = "0";
        delete bridge.dataset.activePanel;
        delete bridge.dataset.heroDark;
      };

      const hidePanelsForStory = () => {
        gsap.set([problems, features, skills, pricing, closing], {
          opacity: 0,
          y: 16,
          filter: "blur(5px)",
          pointerEvents: "none",
        });
        // Hero stays composed and visible at the start of the pin.
        gsap.set(hero, {
          opacity: 1,
          y: 0,
          filter: "none",
          pointerEvents: "auto",
        });
        gsap.set(allHeroLayers, LAYER_SHOWN);
        // Bgs fade opacity only; copy/actions use the shared enter recipe.
        gsap.set(
          [...closingLayers.ctaBg, ...closingLayers.footerBg],
          { opacity: 0 },
        );
        gsap.set(
          [
            ...closingLayers.ctaTitle,
            ...closingLayers.ctaCopy,
            ...closingLayers.ctaActions,
            ...closingLayers.footerContent,
          ],
          LAYER_ENTER,
        );
        // Closing shell stays mounted so layered fades can reveal bg first.
        gsap.set(closing, {
          opacity: 1,
          y: 0,
          filter: "none",
          pointerEvents: "none",
        });
        setItemsVisible("[data-feature-item]", false);
        setItemsVisible("[data-step-item]", false);
        setItemsVisible("[data-pricing-shell]", false);
        setItemsVisible("[data-pricing-item]", false);
      };

      const syncPanelPointerEvents = () => {
        for (const panel of panels) {
          // Hero and closing follow their background layer, not the shell.
          const source =
            panel === closing
              ? (closingLayers.ctaBg[0] ?? closing)
              : panel === hero
                ? (heroLayers.bg[0] ?? hero)
                : panel;
          const opacity = Number(gsap.getProperty(source, "opacity"));
          const next = opacity > 0.35 ? "auto" : "none";
          // Called from every tween update: skip no-op writes (each one is a
          // style mutation that the section-active observers react to).
          if (panel.style.pointerEvents !== next) {
            panel.style.pointerEvents = next;
          }
        }

        // The header follows the hero's dark background directly, so it turns
        // solid the moment the page goes light — not when the next panel's
        // seek mark is reached.
        const heroBg = heroLayers.bg[0] ?? hero;
        const heroDark =
          Number(gsap.getProperty(heroBg, "opacity")) > 0.5 ? "true" : "false";
        if (bridge.dataset.heroDark !== heroDark) {
          bridge.dataset.heroDark = heroDark;
        }
      };

      const seekToPanel = (key: PanelKey) => {
        const st = activeTrigger;
        if (!st) return;
        const progress = SEEK_PROGRESS[key];
        const y = st.start + (st.end - st.start) * progress;
        window.scrollTo(0, y);
        ScrollTrigger.update();
      };

      const mm = gsap.matchMedia();
      mm.add(
        {
          // Wide screen + mouse/trackpad. Touch tablets in landscape scroll
          // natively instead of fighting the pinned, scrubbed story.
          desktop: STORY_POINTER_QUERY,
          motionOK: "(prefers-reduced-motion: no-preference)",
        },
        (context) => {
          const { desktop, motionOK } = context.conditions!;

          if (!desktop || !motionOK) {
            delete bridge.dataset.flightActive;
            setPlaneMounted(false);
            showAllPanels();
            return;
          }

          bridge.dataset.flightActive = "true";
          setPlaneMounted(true);
          hidePanelsForStory();
          if (!measurePath()) {
            showAllPanels();
            return;
          }

          const flight = { progress: 0 };
          placePlane(0);
          bridge.dataset.activePanel = "hero";
          bridge.dataset.heroDark = "true";

          /**
           * One scrubbed timeline for the whole page story:
           * hero exit → plane legs (problems…pricing) → closing enter.
           */
          const tl = gsap.timeline({
            defaults: { ease: "none" },
          });

          // ——— Hero hierarchical exit (reverse = enter when scrubbing up)
          const heroStep = 0.22;
          const heroDur = 0.38;
          // actions → copy → title → bg
          tl.to(
            heroLayers.actions,
            {
              ...LAYER_EXIT,
              duration: heroDur,
              ease: "power2.in",
              onUpdate: syncPanelPointerEvents,
            },
            0.12,
          );
          tl.to(
            heroLayers.copy,
            {
              ...LAYER_EXIT,
              duration: heroDur,
              ease: "power2.in",
              onUpdate: syncPanelPointerEvents,
            },
            0.12 + heroStep,
          );
          tl.to(
            heroLayers.title,
            {
              ...LAYER_EXIT,
              duration: heroDur,
              ease: "power2.in",
              onUpdate: syncPanelPointerEvents,
            },
            0.12 + heroStep * 2,
          );
          tl.to(
            heroLayers.bg,
            {
              opacity: 0,
              duration: heroDur + 0.08,
              ease: "power2.in",
              onUpdate: syncPanelPointerEvents,
            },
            0.12 + heroStep * 3,
          );

          // One feature on screen at a time. The extra hold is inserted
          // before the features exit so later panels keep their flight progress.
          const featureCount = Math.max(
            sortedItems("[data-feature-item]").length,
            1,
          );
          const featureBeat = 0.74;
          const featureFade = 0.32;
          /** Problems is fully in here; the hold starts and everything after
           *  this point is pushed back by PROBLEMS_HOLD (see shiftChildren). */
          const problemsHoldAt = MID + LEG * 0.9;
          const held = (at: number) =>
            at >= problemsHoldAt ? at + PROBLEMS_HOLD : at;
          const featuresEnterAt = MID + LEG * 1.85;
          const featuresExitAt = MID + LEG * 2.9;
          const sequenceStart = featuresEnterAt;
          const sequenceSpan = featureBeat * featureCount;
          const extra = Math.max(0, sequenceStart + sequenceSpan - featuresExitAt);
          const shift = (at: number) => at + extra;

          // Steps only play the left-to-right pass, slowed so it does not
          // cross the section in one gesture. The return leg is not shown.
          const SKILLS_SLOW = 2.4;
          const flightAtFeaturesExit = featuresExitAt - MID;
          const flightPause = flightAtFeaturesExit / PATH_LEGS;
          const flightRemainEarly = PATH_LEGS - flightAtFeaturesExit;
          const flightRateEarly =
            (1 - flightPause) / Math.max(0.001, flightRemainEarly);
          const skillsStart = flightPause + 0.95 * flightRateEarly;

          const tangentAt = (t: number) => {
            const distance = clamp(t, 0, 1) * pathLength;
            const here = pointAt(distance);
            const ahead = pointAt(
              Math.min(pathLength, distance + 16),
            );
            return ahead.x - here.x;
          };

          const syncStepsEntrance = () => {
            stepsVisibleFrom = skillsStart;
            stepsVisibleUntil = Math.min(1, skillsStart + 0.12);
            if (pathLength <= 0) return;
            const pinW = pin.offsetWidth;
            let sawLeft = false;
            for (let t = skillsStart; t <= skillsStart + 0.14; t += 0.002) {
              const dx = tangentAt(t);
              if (dx < -1) sawLeft = true;
              if (sawLeft && dx > 1) {
                stepsVisibleFrom = t;
                break;
              }
            }
            let lastRight = stepsVisibleFrom;
            // Keep the L→R pass running until the plane is fully past the
            // right edge — otherwise arrow stops can park it half on-screen.
            for (
              let t = stepsVisibleFrom;
              t <= Math.min(1, stepsVisibleFrom + 0.4);
              t += 0.002
            ) {
              const dx = tangentAt(t);
              const point = pointAt(clamp(t, 0, 1) * pathLength);
              if (dx > 1) lastRight = t;
              if (point.x > pinW * 1.05) {
                stepsVisibleUntil = t;
                return;
              }
              if (dx < -1 && lastRight > stepsVisibleFrom + 0.01) {
                stepsVisibleUntil = lastRight;
                return;
              }
            }
            stepsVisibleUntil = lastRight;
          };
          syncStepsEntrance();

          const skillsEnterAt = shift(MID + LEG * 3.85);
          const progressAtSteps =
            flightPause +
            (skillsEnterAt - shift(featuresExitAt)) * flightRateEarly;
          const l2rSpan = Math.max(
            0.45,
            (stepsVisibleUntil - progressAtSteps) / flightRateEarly,
          );
          const skillsFlightEnd = skillsEnterAt + l2rSpan;
          const skillsFadeDur = LEG * 0.55;
          const skillsFadeAt = skillsFlightEnd;
          const previousVisibleEnd = shift(MID + LEG * 5.05) + LEG * 0.75;
          const skillsExtra = l2rSpan * (SKILLS_SLOW - 1);
          const stretchSteps = (at: number) => {
            if (at <= skillsEnterAt) return at;
            if (at < skillsFlightEnd) {
              return skillsEnterAt + (at - skillsEnterAt) * SKILLS_SLOW;
            }
            return at + skillsExtra;
          };

          const pricingShellCount = Math.max(
            sortedItems("[data-pricing-shell]").length,
            1,
          );
          const pricingPlanCount = Math.max(
            sortedItems("[data-pricing-item]").length,
            1,
          );
          const pricingBeat = 0.55;
          const pricingFade = 0.28;
          const pricingEnterAt = stretchSteps(shift(MID + LEG * 5.85));
          const pricingSteps = pricingShellCount + pricingPlanCount;
          const pricingSequenceEnd = pricingEnterAt + pricingBeat * pricingSteps;
          const oldCloseAt = shift(MID + PATH_LEGS + PRICING_SETTLE);
          const closeAt = Math.max(oldCloseAt, pricingSequenceEnd + 0.42);
          const pinUnits =
            TOTAL + extra + (closeAt - oldCloseAt) + PROBLEMS_HOLD;

          const sectionStops = [
            0.02,
            // Middle of the problems hold: the section is fully shown.
            (problemsHoldAt + PROBLEMS_HOLD * 0.5) / pinUnits,
            (held(shift(featuresExitAt)) - 0.05) / pinUnits,
            // After the plane has cleared the viewport, while steps are still up.
            (held(stretchSteps(skillsFadeAt)) + 0.04) / pinUnits,
            (held(pricingSequenceEnd) - 0.08) / pinUnits,
            (held(closeAt) + 1.05) / pinUnits,
          ].map((mark) => clamp(mark, 0, 0.99));

          SEEK_PROGRESS.hero = sectionStops[0];
          SEEK_PROGRESS.problems = sectionStops[1];
          SEEK_PROGRESS.features = sectionStops[2];
          SEEK_PROGRESS.skills = sectionStops[3];
          SEEK_PROGRESS.pricing = sectionStops[4];
          SEEK_PROGRESS.closing = sectionStops[5];

          const paintFeatureSequence = (p: number) => {
            const items = sortedItems("[data-feature-item]");
            items.forEach((item, i) => {
              const start = Math.max(0, i - featureFade);
              const amount =
                p >= i
                  ? 1
                  : clamp((p - start) / Math.max(0.001, i - start), 0, 1);
              gsap.set(item, {
                opacity: amount,
                y: (1 - amount) * 16,
                filter: amount > 0.92 ? "none" : `blur(${(1 - amount) * 5}px)`,
              });
            });
          };

          // Plane rides the path only during the middle story.
          // Progress pauses while the features take turns, then resumes.
          // Up to the problems hold it covers its first stretch over the
          // hold too (slower), then carries on at the usual pace.
          const flightAtHold = problemsHoldAt - MID;
          tl.to(
            flight,
            {
              progress: flightAtHold / PATH_LEGS,
              duration: flightAtHold + PROBLEMS_HOLD,
              ease: "none",
              onUpdate: () => placePlane(flight.progress),
            },
            MID,
          );
          tl.to(
            flight,
            {
              progress: flightAtFeaturesExit / PATH_LEGS,
              duration: flightAtFeaturesExit - flightAtHold,
              ease: "none",
              onUpdate: () => placePlane(flight.progress),
            },
            problemsHoldAt,
          );
          tl.to(
            {},
            {
              duration: extra,
              onUpdate: () => placePlane(flight.progress),
            },
            featuresExitAt,
          );
          const resumeAt = shift(featuresExitAt);
          const flightRemain = PATH_LEGS - flightAtFeaturesExit;
          const beforeSteps = skillsEnterAt - resumeAt;
          const previousAfter = flightRemain - (previousVisibleEnd - resumeAt);
          const previousFlightEnd =
            skillsEnterAt +
            (previousVisibleEnd - skillsEnterAt) * SKILLS_SLOW +
            previousAfter;
          const slowedFlight = l2rSpan * SKILLS_SLOW;
          const afterStart = skillsEnterAt + slowedFlight + skillsFadeDur;
          const afterSteps = Math.max(0.05, previousFlightEnd - afterStart);
          /** Scroll progress at the middle of the plane's pass over the steps. */
          const stepsFlightMid =
            held(skillsEnterAt + slowedFlight / 2) / pinUnits;
          tl.to(
            flight,
            {
              progress: progressAtSteps,
              duration: beforeSteps,
              ease: "none",
              onUpdate: () => placePlane(flight.progress),
            },
            resumeAt,
          );
          tl.to(
            flight,
            {
              progress: stepsVisibleUntil,
              duration: slowedFlight,
              ease: "none",
              onUpdate: () => placePlane(flight.progress),
            },
            skillsEnterAt,
          );
          tl.to(
            {},
            {
              duration: skillsFadeDur,
              onUpdate: () => placePlane(flight.progress),
            },
            skillsEnterAt + slowedFlight,
          );
          tl.to(
            flight,
            {
              progress: 1,
              duration: afterSteps,
              ease: "none",
              onUpdate: () => placePlane(flight.progress),
            },
            afterStart,
          );

          // Problems — enter with plane L→R, exit with R→L
          tl.fromTo(
            problems,
            { opacity: 0, y: 18, filter: "blur(6px)" },
            {
              opacity: 1,
              y: 0,
              filter: "blur(0px)",
              duration: LEG * 0.85,
              ease: "power2.out",
              onUpdate: syncPanelPointerEvents,
            },
            MID + 0.05,
          );
          tl.to(
            problems,
            {
              opacity: 0,
              y: -8,
              filter: "blur(4px)",
              duration: LEG * 0.75,
              ease: "power2.in",
              onUpdate: syncPanelPointerEvents,
            },
            MID + LEG * 0.9,
          );

          // Features shell stays up while each feature takes a turn.
          setItemsVisible("[data-feature-item]", false);
          tl.fromTo(
            features,
            { opacity: 0, y: 18, filter: "blur(6px)" },
            {
              opacity: 1,
              y: 0,
              filter: "blur(0px)",
              duration: LEG * 0.4,
              ease: "power2.out",
              onUpdate: syncPanelPointerEvents,
            },
            featuresEnterAt,
          );
          const featureCursor = { p: 0 };
          paintFeatureSequence(0);
          tl.fromTo(
            featureCursor,
            { p: 0 },
            {
              p: Math.max(0, featureCount - 1),
              duration: featureBeat * Math.max(featureCount - 1, 1),
              ease: "none",
              immediateRender: false,
              onUpdate: () => paintFeatureSequence(featureCursor.p),
            },
            sequenceStart,
          );
          tl.to(
            features,
            {
              opacity: 0,
              y: -8,
              filter: "blur(4px)",
              duration: LEG * 0.75,
              ease: "power2.in",
              onUpdate: syncPanelPointerEvents,
            },
            shift(featuresExitAt),
          );

          // Skills shell (title/lead); steps reveal via plane X — same as features.
          setItemsVisible("[data-step-item]", false);
          tl.fromTo(
            skills,
            { opacity: 0, y: 18, filter: "blur(6px)" },
            {
              opacity: 1,
              y: 0,
              filter: "blur(0px)",
              duration: LEG * 0.35,
              ease: "power2.out",
              onUpdate: () => {
                syncPanelPointerEvents();
                placePlane(flight.progress);
              },
            },
            shift(MID + LEG * 3.85),
          );
          tl.to(
            skills,
            {
              opacity: 0,
              y: -8,
              filter: "blur(4px)",
              duration: skillsFadeDur,
              ease: "power2.in",
              onUpdate: () => {
                syncPanelPointerEvents();
                placePlane(flight.progress);
              },
            },
            stretchSteps(skillsFadeAt),
          );

          // Pricing: title, description, then the selector. Plans then
          // appear one by one and stay; scrolling back hides them in reverse.
          setItemsVisible("[data-pricing-shell]", false);
          setItemsVisible("[data-pricing-item]", false);
          const paintPricingSequence = (p: number) => {
            const shell = sortedItems("[data-pricing-shell]");
            shell.forEach((item, i) => {
              const start = Math.max(0, i - pricingFade);
              const amount =
                p >= i
                  ? 1
                  : clamp((p - start) / Math.max(0.001, i - start), 0, 1);
              gsap.set(item, {
                opacity: amount,
                y: (1 - amount) * 14,
                filter: amount > 0.92 ? "none" : `blur(${(1 - amount) * 4}px)`,
              });
            });
            const plans = sortedItems("[data-pricing-item]");
            plans.forEach((item, i) => {
              const slot = pricingShellCount + i;
              const start = Math.max(0, slot - pricingFade);
              const amount =
                p >= slot
                  ? 1
                  : clamp((p - start) / Math.max(0.001, slot - start), 0, 1);
              gsap.set(item, {
                opacity: amount,
                y: (1 - amount) * 16,
                filter: amount > 0.92 ? "none" : `blur(${(1 - amount) * 5}px)`,
              });
            });
          };
          paintPricingSequence(0);
          const pricingCursor = { p: 0 };
          tl.fromTo(
            pricing,
            { opacity: 0, y: 18, filter: "blur(6px)" },
            {
              opacity: 1,
              y: 0,
              filter: "blur(0px)",
              duration: LEG * 0.4,
              ease: "power2.out",
              onUpdate: syncPanelPointerEvents,
            },
            pricingEnterAt,
          );
          tl.fromTo(
            pricingCursor,
            { p: 0 },
            {
              p: pricingSteps,
              duration: pricingBeat * pricingSteps,
              ease: "none",
              immediateRender: false,
              onUpdate: () => paintPricingSequence(pricingCursor.p),
            },
            pricingEnterAt,
          );
          tl.to(
            pricing,
            {
              opacity: 0,
              y: -8,
              filter: "blur(4px)",
              duration: LEG * 0.4,
              ease: "power2.in",
              onUpdate: syncPanelPointerEvents,
            },
            pricingSequenceEnd,
          );

          // ——— Closing (CTA + Footer) hierarchical enter
          // CTA + Footer backgrounds rise together so the pin's --papel
          // never shows as a hard band under a half-visible purple CTA.
          const closeStep = 0.16;
          const closeDur = 0.36;
          const bgDur = closeDur + 0.14;

          tl.fromTo(
            closingLayers.ctaBg,
            { opacity: 0 },
            {
              opacity: 1,
              duration: bgDur,
              ease: "power2.out",
              onUpdate: syncPanelPointerEvents,
            },
            closeAt,
          );
          tl.fromTo(
            closingLayers.footerBg,
            { opacity: 0 },
            {
              opacity: 1,
              duration: bgDur,
              ease: "power2.out",
              onUpdate: syncPanelPointerEvents,
            },
            closeAt + 0.06,
          );
          tl.fromTo(
            closingLayers.ctaTitle,
            LAYER_ENTER,
            {
              ...LAYER_SHOWN,
              duration: closeDur,
              ease: "power2.out",
              onUpdate: syncPanelPointerEvents,
            },
            closeAt + closeStep,
          );
          tl.fromTo(
            closingLayers.ctaCopy,
            LAYER_ENTER,
            {
              ...LAYER_SHOWN,
              duration: closeDur,
              ease: "power2.out",
              onUpdate: syncPanelPointerEvents,
            },
            closeAt + closeStep * 2,
          );
          tl.fromTo(
            closingLayers.ctaActions,
            LAYER_ENTER,
            {
              ...LAYER_SHOWN,
              duration: closeDur,
              ease: "power2.out",
              onUpdate: syncPanelPointerEvents,
            },
            closeAt + closeStep * 3,
          );
          tl.fromTo(
            closingLayers.footerContent,
            LAYER_ENTER,
            {
              ...LAYER_SHOWN,
              duration: closeDur,
              ease: "power2.out",
              onUpdate: syncPanelPointerEvents,
            },
            closeAt + closeStep * 4,
          );
          tl.to({}, { duration: 0.35 }, closeAt + CLOSING_SEG - 0.35);

          // Open the problems hold: everything from the moment problems is
          // fully in onwards starts PROBLEMS_HOLD later.
          tl.shiftChildren(PROBLEMS_HOLD, true, problemsHoldAt);

          activeTrigger = ScrollTrigger.create({
            trigger: bridge,
            pin: pin,
            scrub: STORY_SCRUB,
            start: "top top",
            end: () =>
              `+=${Math.round(window.innerHeight * pinUnits * 0.62)}`,
            animation: tl,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onRefresh: () => {
              const was = flight.progress;
              measurePath();
              syncStepsEntrance();
              placePlane(was);
              // Refresh can render the timeline at other progress values
              // (e.g. the end) to measure it; re-read the real state after.
              requestAnimationFrame(syncPanelPointerEvents);
            },
            onUpdate: (self) => {
              const index = sectionStops.reduce(
                (best, mark, i) => (self.progress + 0.012 >= mark ? i : best),
                0,
              );
              bridge.dataset.storyIndex = String(index);
              bridge.dataset.storyCount = String(sectionStops.length);
              bridge.dataset.activePanel = activePanelFromProgress(
                self.progress,
              );
            },
            onToggle: (self) => {
              if (self.isActive) {
                claimPageScroll(STORY_OWNER);
              } else {
                releasePageScroll(STORY_OWNER);
                lockPageSnapBriefly(450);
              }
            },
          });

          requestAnimationFrame(syncPanelPointerEvents);

          // Pin is active at load — claim immediately.
          if (activeTrigger.isActive) {
            claimPageScroll(STORY_OWNER);
          }

          const onSeek = (event: Event) => {
            const id = (event as CustomEvent<{ id?: string }>).detail?.id;
            const key = panelKeyFromTarget(id);
            if (!key) return;
            requestAnimationFrame(() => seekToPanel(key));
          };

          const onHash = () => {
            const hash = window.location.hash.replace(/^#/, "");
            const key = panelKeyFromTarget(hash);
            if (key) jumpToPanel(key);
          };

          /**
           * Arrow controls glide to the next section slowly enough for the
           * story (plane flight, reveals) to play out in front of the user.
           */
          let glide: gsap.core.Tween | null = null;
          /** Stop the current glide is heading to — extra clicks chain from here. */
          let glideTarget: number | null = null;
          let chainingGlide = false;
          const restoreStoryScrub = () => {
            const st = activeTrigger;
            if (!st) return;
            // scrubDuration(0) nulls the tween; restoring recreates it so the
            // wheel can drive the timeline again after an arrow glide.
            setScrubDuration(st, STORY_SCRUB);
            ScrollTrigger.update();
          };

          const glideTo = (
            progress: number,
            limits: { min: number; max: number; perUnit: number } = {
              min: NAV_GLIDE_MIN_S,
              max: NAV_GLIDE_MAX_S,
              perUnit: NAV_GLIDE_S_PER_UNIT,
            },
            // Starts moving on click (no ease-in lag); soft landing only.
            ease = "power2.out",
          ) => {
            const st = activeTrigger;
            if (!st) return;
            const target = clamp(progress, 0, 0.995);
            const from = glideTarget ?? (st.isActive ? st.progress : 0);
            const timelineSpan = Math.abs(target - from) * tl.duration();
            const duration = gsap.utils.clamp(
              limits.min,
              limits.max,
              timelineSpan * limits.perUnit,
            );
            const y = st.start + (st.end - st.start) * target;
            chainingGlide = true;
            glide?.kill();
            chainingGlide = false;
            glideTarget = target;
            // Immediate scrub keeps fades/plane locked to the guided scroll
            // without killTweensOf(tl), which orphaned ScrollTrigger's scrub
            // and left the mouse wheel unable to change sections.
            setScrubDuration(st, 0);
            glide = gsap.to(window, {
              scrollTo: { y, autoKill: false },
              duration,
              ease,
              overwrite: true,
              onComplete: () => {
                glide = null;
                glideTarget = null;
                restoreStoryScrub();
              },
              onInterrupt: () => {
                if (!chainingGlide) {
                  glide = null;
                  glideTarget = null;
                  restoreStoryScrub();
                }
              },
            });
          };

          /** Index (in sectionStops) of the section the story rests on. */
          let settled = 0;
          const lastStop = sectionStops.length - 1;

          // The hero rests at the very top of the page (its seek mark sits a
          // little in, which made the first scroll from the top count short).
          const stopProgress = (index: number) =>
            index === 0 ? 0 : sectionStops[index];

          const stopY = (index: number) => {
            const st = activeTrigger!;
            return st.start + (st.end - st.start) * stopProgress(index);
          };

          const nearestStopByY = (y: number) =>
            sectionStops.reduce(
              (best, _mark, i) =>
                Math.abs(stopY(i) - y) < Math.abs(stopY(best) - y) ? i : best,
              0,
            );

          const glideToStop = (
            index: number,
            seconds: number,
            ease: string = STEP_EASE,
          ) => {
            settled = index;
            glideTo(
              stopProgress(index),
              { min: seconds, max: seconds, perUnit: 0 },
              ease,
            );
          };

          /**
           * Time to glide from the current scroll position to stop `index`,
           * from the amount of story (timeline units) in between.
           */
          const stepSeconds = (index: number, from?: number) => {
            const st = activeTrigger!;
            const span = st.end - st.start;
            const start =
              from ?? (span > 0 ? (window.scrollY - st.start) / span : 0);
            const end = stopProgress(index);
            const units = Math.abs(end - start) * tl.duration();
            const seconds = gsap.utils.clamp(
              STEP_GLIDE_MIN_S,
              STEP_GLIDE_MAX_S,
              units * STEP_S_PER_UNIT,
            );
            // Glides that cross the steps flight get extra time.
            const crossesStepsFlight =
              Math.min(start, end) < stepsFlightMid &&
              Math.max(start, end) > stepsFlightMid;
            return crossesStepsFlight ? seconds * STEPS_FLIGHT_SLOW : seconds;
          };

          /** A whole step (arrows, keys) to stop `index`. */
          const stepToStop = (index: number) =>
            glideToStop(index, stepSeconds(index));

          /** Arrow buttons / keys: a whole step to the next/previous section. */
          const stepStory = (direction: 1 | -1) => {
            if (!activeTrigger) return false;
            const target = settled + direction;
            if (target < 0 || target > lastStop) return false;
            stepToStop(target);
            return true;
          };

          const onNavStep = (event: Event) => {
            if (!activeTrigger) return;
            const detail = (event as CustomEvent<{ direction: 1 | -1 }>)
              .detail;
            if (!detail) return;

            event.stopImmediatePropagation();
            stepStory(detail.direction);
          };

          /** True while the page scroll sits inside the pinned story. */
          const inStory = () => {
            const st = activeTrigger;
            if (!st) return false;
            const y = window.scrollY;
            return y >= st.start - 2 && y <= st.end + 2;
          };

          /**
           * Free scroll drives the story as before. Once the user has scrolled
           * STEP_TRIGGER of the way from the current section towards the
           * next/previous one, the rest of the transition plays on its own and
           * lands on that section. Stopping short of the trigger glides back,
           * so the page never rests between two sections.
           */
          let idleTimer = 0;
          let pointerDown = false;
          /** Set when an auto-glide starts; ends once the wheel goes quiet. */
          let gestureLocked = false;
          let lastWheelAt = 0;

          const settleBack = () => {
            if (glide || pointerDown || !inStory()) return;
            if (Math.abs(window.scrollY - stopY(settled)) > 2) {
              glideToStop(settled, SNAP_BACK_S);
            }
          };

          const onScroll = () => {
            window.clearTimeout(idleTimer);
            if (!activeTrigger || glide || !inStory()) return;

            const y = window.scrollY;
            // Jumped past the neighbouring sections (scrollbar drag, nav
            // link, find-in-page…): rest on whichever section is closest.
            const low = stopY(Math.max(settled - 1, 0));
            const high = stopY(Math.min(settled + 1, lastStop));
            if (y < low - 4 || y > high + 4) {
              settled = nearestStopByY(y);
            }

            const fromY = stopY(settled);
            const moved = y - fromY;
            const target = settled + (moved > 0 ? 1 : -1);
            if (Math.abs(moved) > 2 && target >= 0 && target <= lastStop) {
              const gap = Math.abs(stopY(target) - fromY);
              const trigger = Math.min(
                gap * STEP_TRIGGER_FRACTION,
                STEP_TRIGGER_MAX_PX,
              );
              if (Math.abs(moved) >= trigger) {
                // Same glide as the arrow buttons: the duration of the whole
                // step (from the section we left) and the same ease.
                gestureLocked = true;
                glideToStop(target, stepSeconds(target, stopProgress(settled)));
                return;
              }
            }

            idleTimer = window.setTimeout(settleBack, SETTLE_IDLE_MS);
          };

          /**
           * While an auto-glide plays, the wheel must not fight it; trackpad
           * inertia keeps firing for ~1s, so the rest of that gesture is
           * swallowed until the wheel goes quiet for GESTURE_GAP_MS.
           */
          const onWheel = (event: WheelEvent) => {
            if (event.ctrlKey) return; // pinch / browser zoom
            if (!inStory()) return;
            // Horizontal swipes belong to carousels (hero highlights).
            if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;

            const now = performance.now();
            const quiet = now - lastWheelAt > GESTURE_GAP_MS;
            lastWheelAt = now;
            if (glide || (gestureLocked && !quiet)) {
              event.preventDefault();
              return;
            }
            gestureLocked = false;
          };

          const onPointerDown = () => {
            pointerDown = true;
          };
          const onPointerUp = () => {
            if (!pointerDown) return;
            pointerDown = false;
            // Scrollbar drag released between sections: settle.
            window.clearTimeout(idleTimer);
            idleTimer = window.setTimeout(settleBack, SETTLE_IDLE_MS);
          };

          const onKey = (event: KeyboardEvent) => {
            if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) {
              return;
            }
            const el = event.target as HTMLElement | null;
            if (
              el?.closest?.(
                "input, textarea, select, [contenteditable=''], [contenteditable='true']",
              )
            ) {
              return;
            }
            if (!inStory()) return;

            let direction: 1 | -1 | 0 = 0;
            if (["ArrowDown", "PageDown"].includes(event.key)) direction = 1;
            else if (["ArrowUp", "PageUp"].includes(event.key)) direction = -1;
            else if (event.key === " ") direction = event.shiftKey ? -1 : 1;
            else if (event.key === "Home") {
              event.preventDefault();
              stepToStop(0);
              return;
            } else if (event.key === "End") {
              event.preventDefault();
              stepToStop(lastStop);
              return;
            }
            if (!direction) return;
            // Space on a focused button/link activates it, not the page.
            if (event.key === " " && el?.closest?.("button, a, [role='button']")) {
              return;
            }

            event.preventDefault();
            if (event.repeat && glide) return;
            stepStory(direction);
          };

          /**
           * Jump straight to a panel. The scrub is switched off for the jump so
           * the timeline lands on the target at once instead of easing through
           * (and briefly showing) every panel in between.
           */
          const jumpToPanel = (key: PanelKey) => {
            const st = activeTrigger;
            if (!st) return;
            chainingGlide = true;
            glide?.kill();
            chainingGlide = false;
            glide = null;
            glideTarget = null;
            setScrubDuration(st, 0);
            settled = Math.max(PANEL_KEYS.indexOf(key), 0);
            seekToPanel(key);
            restoreStoryScrub();
          };

          /** Nav links (header/footer/menu) jump to a panel instantly. */
          const onGoto = (event: Event) => {
            const id = (event as CustomEvent<{ id?: string }>).detail?.id;
            const key = panelKeyFromTarget(id);
            if (!key) return;
            jumpToPanel(key);
          };

          window.addEventListener("tp-section-arrive", onSeek);
          window.addEventListener("tp-story-goto", onGoto);
          window.addEventListener("hashchange", onHash);
          window.addEventListener("tp-nav-step", onNavStep, true);
          // Capture + non-passive: must preventDefault before native scroll
          // (and before SectionSnap, which stands down inside the story).
          window.addEventListener("wheel", onWheel, {
            passive: false,
            capture: true,
          });
          window.addEventListener("scroll", onScroll, { passive: true });
          window.addEventListener("pointerdown", onPointerDown, true);
          window.addEventListener("pointerup", onPointerUp, true);
          window.addEventListener("keydown", onKey);
          settled = nearestStopByY(window.scrollY);
          if (window.location.hash) {
            requestAnimationFrame(onHash);
          }

          return () => {
            window.removeEventListener("tp-section-arrive", onSeek);
            window.removeEventListener("tp-story-goto", onGoto);
            window.removeEventListener("hashchange", onHash);
            window.removeEventListener("tp-nav-step", onNavStep, true);
            window.removeEventListener("wheel", onWheel, true);
            window.removeEventListener("scroll", onScroll);
            window.removeEventListener("pointerdown", onPointerDown, true);
            window.removeEventListener("pointerup", onPointerUp, true);
            window.removeEventListener("keydown", onKey);
            window.clearTimeout(idleTimer);
            glide?.kill();
            releasePageScroll(STORY_OWNER);
            activeTrigger?.kill();
            activeTrigger = null;
            tl.kill();
            delete bridge.dataset.flightActive;
            delete bridge.dataset.activePanel;
            delete bridge.dataset.heroDark;
            setPlaneMounted(false);
            plane.style.opacity = "0";
            plane.style.transform = "";
            showAllPanels();
          };
        },
      );

      return () => {
        mm.revert();
      };
    },
    { scope: bridgeRef, dependencies: [], revertOnUpdate: true },
  );

  return (
    <div
      ref={bridgeRef}
      className={styles.bridge}
      data-snap-section
      data-snap-id="inicio"
      data-story-bridge
    >
      <div ref={pinRef} className={styles.pin}>
        <div className={styles.stage}>
          {childList.map((child, index) => {
            const key = PANEL_KEYS[index] ?? `panel-${index}`;
            return (
              <div
                key={key}
                className={styles.panel}
                data-story-panel={key}
                ref={(node) => {
                  panelRefs.current[index] = node;
                }}
              >
                {child}
              </div>
            );
          })}
        </div>

        <div className={styles.planeLayer} aria-hidden="true">
          <div ref={planeRef} className={styles.plane}>
            {planeMounted && <StoryAirliner />}
          </div>
        </div>
      </div>
    </div>
  );
}

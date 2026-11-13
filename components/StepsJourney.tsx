"use client";

import siteStyles from "@/app/site.module.css";
import { STEPS } from "@/lib/site-data";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { FaPlaneUp } from "react-icons/fa6";
import styles from "./StepsJourney.module.css";

/**
 * Ease-in-out S-curve: horizontal at start & end, stronger climb in the middle.
 * viewBox: 0 0 2400 420 — checkpoints at equal X (start / mid / end).
 */
const PATH_D = "M 56 295 C 740 295 1720 18 2344 18";

/** Defaults; recalculated on measure for equal X spacing across the container */
const DEFAULT_CHECKPOINTS = [0, 0.5, 1] as const;

const HEADER_OFFSET_PX = 58;
const SCROLL_SMOOTHING = 0.07;
const SNAP_EPS = 0.0005;
const FLIP_SMOOTHING = 0.12;
const DIRECTION_EPS = 0.00015;
const PLANE_ANGLE_OFFSET = 90;
const VIEWBOX_W = 2400;
const VIEWBOX_H = 420;
/** Wheel delta needed for the full capture (plane + read margin) */
const WHEEL_RANGE_VIEWPORTS = 1.35;
/**
 * Plane reaches the last checkpoint at this fraction of the wheel range;
 * the remainder is a hold so the user can read before page scroll resumes.
 */
const PLANE_END_AT = 0.72;
/** If the section already overshot the pin by more than this, don't snap back */
const OVERSHOOT_PX = 140;
/** Path animation + wheel lock only from this width up (tablets stay on mobile layout) */
const DESKTOP_MIN_WIDTH_PX = 1024;

/** Viewport top offset that vertically centers the section on screen. */
function centerPinTop(sectionHeight: number) {
  return (window.innerHeight - sectionHeight) / 2;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function lerp(from: number, to: number, amount: number) {
  return from + (to - from) * amount;
}

/** Find path-progress at a target SVG X (for evenly spaced checkpoints). */
function progressAtX(path: SVGPathElement, length: number, targetX: number) {
  let lo = 0;
  let hi = length;
  for (let i = 0; i < 18; i += 1) {
    const mid = (lo + hi) / 2;
    if (path.getPointAtLength(mid).x < targetX) lo = mid;
    else hi = mid;
  }
  return clamp(((lo + hi) / 2) / length, 0, 1);
}

function buildEvenCheckpoints(path: SVGPathElement, length: number) {
  const start = path.getPointAtLength(0).x;
  const end = path.getPointAtLength(length).x;
  const mid = (start + end) / 2;
  return [0, progressAtX(path, length, mid), 1] as [number, number, number];
}

export function StepsJourney() {
  const rootRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const pathRef = useRef<SVGPathElement | null>(null);
  const progressPathRef = useRef<SVGPathElement | null>(null);
  const planeRef = useRef<HTMLDivElement | null>(null);
  const markersRef = useRef<(HTMLSpanElement | null)[]>([]);
  const stepRefs = useRef<(HTMLLIElement | null)[]>([]);

  const visualProgress = useRef(0);
  const scrollTarget = useRef(0);
  /** 0–1 capture progress including the post-last-step read margin */
  const rawProgress = useRef(0);
  const pathLength = useRef(0);
  const checkpoints = useRef<[number, number, number]>([...DEFAULT_CHECKPOINTS]);
  const reducedMotion = useRef(false);
  const rafId = useRef(0);
  const activeStepRef = useRef(0);
  const travelDir = useRef<1 | -1>(1);
  const flipAngle = useRef(0);
  const locked = useRef(false);
  const lockScrollY = useRef(0);

  const planeFromRaw = useCallback((raw: number) => {
    return clamp(raw / PLANE_END_AT, 0, 1);
  }, []);

  const stepFromProgress = useCallback((progress: number) => {
    const [a, b, c] = checkpoints.current;
    if (progress >= c - 0.012) return 2;
    if (progress >= b - 0.012) return 1;
    if (progress >= a - 0.012) return 0;
    return -1;
  }, []);

  const [activeStep, setActiveStep] = useState(0);
  // Mobile-first: assume non-desktop until matchMedia runs (avoids path/lock under 1024px)
  const [isDesktop, setIsDesktop] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  const pathPointToTrack = useCallback((x: number, y: number) => {
    const path = pathRef.current;
    const track = trackRef.current;
    const svg = path?.ownerSVGElement;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm || !track) return null;

    const pt = svg.createSVGPoint();
    pt.x = x;
    pt.y = y;
    const screen = pt.matrixTransform(ctm);
    const trackRect = track.getBoundingClientRect();
    return {
      x: screen.x - trackRect.left,
      y: screen.y - trackRect.top,
    };
  }, []);

  const placeAnchors = useCallback(
    (progress: number) => {
      const path = pathRef.current;
      const track = trackRef.current;
      if (!path || !track || pathLength.current <= 0) return;

      const length = pathLength.current;
      const markers = checkpoints.current;
      const last = markers.length - 1;
      const trackWidth = track.clientWidth;

      markers.forEach((marker, index) => {
        const point = path.getPointAtLength(marker * length);
        const local = pathPointToTrack(point.x, point.y);
        if (!local) return;

        const checkpoint = markersRef.current[index];
        if (checkpoint) {
          const reached = progress + 0.01 >= marker;
          const onStop = Math.abs(progress - marker) < 0.028;
          checkpoint.style.transform = `translate(${local.x}px, ${local.y}px) translate(-50%, -50%)${
            reached ? " scale(1)" : " scale(0.7)"
          }`;
          checkpoint.classList.toggle(styles.checkpointVisible, reached);
          checkpoint.classList.toggle(styles.checkpointReached, reached);
          checkpoint.classList.toggle(styles.checkpointActive, onStop);
        }

        const step = stepRefs.current[index];
        if (!step) return;

        const xAlign = index === last ? "-100%" : "0%";
        // Step 01: left edge of section; step 03: right edge of section
        const xPos =
          index === 0 ? 0 : index === last ? trackWidth : local.x;
        const yAlign =
          index === 0
            ? "calc(-100% - 2.75rem)"
            : index === last
              ? "2.15rem"
              : "1.35rem";
        step.style.transform = `translate(${xPos}px, ${local.y}px) translate(${xAlign}, ${yAlign})`;
      });
    },
    [pathPointToTrack],
  );

  const placePlane = useCallback(
    (progress: number, facingFlip = 0) => {
      const path = pathRef.current;
      const plane = planeRef.current;
      const progressPath = progressPathRef.current;
      const track = trackRef.current;
      if (!path || !plane || !track || pathLength.current <= 0) return;

      const svg = path.ownerSVGElement;
      if (!svg) return;

      const length = pathLength.current;
      const distance = clamp(progress, 0, 1) * length;
      const point = path.getPointAtLength(distance);
      const ahead = path.getPointAtLength(Math.min(length, distance + 3));
      const behind = path.getPointAtLength(Math.max(0, distance - 3));
      const useAhead = distance < length - 2;

      const scaleX = svg.clientWidth / VIEWBOX_W;
      const scaleY = svg.clientHeight / VIEWBOX_H;
      const dx =
        (useAhead ? ahead.x - point.x : point.x - behind.x) * scaleX;
      const dy =
        (useAhead ? ahead.y - point.y : point.y - behind.y) * scaleY;
      const angle =
        (Math.atan2(dy, dx) * 180) / Math.PI + PLANE_ANGLE_OFFSET + facingFlip;

      const local = pathPointToTrack(point.x, point.y);
      if (!local) return;

      plane.style.transform = `translate(${local.x}px, ${local.y}px) translate(-50%, -50%) rotate(${angle}deg)`;

      if (progressPath) {
        // Draw only the segment the plane has already flown
        progressPath.style.strokeDasharray = `${length}`;
        progressPath.style.strokeDashoffset = `${length - distance}`;
      }

      placeAnchors(progress);
    },
    [pathPointToTrack, placeAnchors],
  );

  const freezePageScroll = useCallback((scrollY: number) => {
    const body = document.body;
    // Store before freezing — while fixed, window.scrollY becomes 0
    lockScrollY.current = Math.max(0, scrollY);
    body.style.position = "fixed";
    body.style.top = `-${lockScrollY.current}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";
  }, []);

  const unfreezePageScroll = useCallback(() => {
    const body = document.body;
    const html = document.documentElement;
    const y = lockScrollY.current;

    // Avoid html { scroll-behavior: smooth } animating from 0 → y (looks like a jump to top)
    const prevBehavior = html.style.scrollBehavior;
    html.style.scrollBehavior = "auto";

    body.style.position = "";
    body.style.top = "";
    body.style.left = "";
    body.style.right = "";
    body.style.width = "";
    body.style.overflow = "";

    window.scrollTo(0, y);
    requestAnimationFrame(() => {
      window.scrollTo(0, y);
      html.style.scrollBehavior = prevBehavior;
    });
  }, []);

  const lockSection = useCallback(() => {
    const root = rootRef.current;
    const panel = panelRef.current;
    if (!root || !panel || locked.current) return;

    const rect = root.getBoundingClientRect();
    const pinTop = centerPinTop(rect.height);
    // Freeze page so the section sits in the middle of the viewport
    const targetY = window.scrollY + rect.top - pinTop;

    root.style.height = `${panel.offsetHeight}px`;
    panel.style.top = `${pinTop}px`;
    freezePageScroll(targetY);
    locked.current = true;
    setIsLocked(true);
  }, [freezePageScroll]);

  const unlockSection = useCallback(() => {
    const root = rootRef.current;
    const panel = panelRef.current;
    if (!root || !locked.current) return;

    locked.current = false;
    setIsLocked(false);
    root.style.height = "";
    if (panel) panel.style.top = "";
    unfreezePageScroll();
  }, [unfreezePageScroll]);

  useLayoutEffect(() => {
    const media = window.matchMedia(`(min-width: ${DESKTOP_MIN_WIDTH_PX}px)`);
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const applyMedia = () => setIsDesktop(media.matches);
    const applyMotion = () => {
      reducedMotion.current = motion.matches;
    };

    applyMedia();
    applyMotion();
    media.addEventListener("change", applyMedia);
    motion.addEventListener("change", applyMotion);

    return () => {
      media.removeEventListener("change", applyMedia);
      motion.removeEventListener("change", applyMotion);
    };
  }, []);

  useEffect(() => {
    const path = pathRef.current;
    if (!path || !isDesktop) {
      unlockSection();
      return;
    }

    const measure = () => {
      const length = path.getTotalLength();
      pathLength.current = length;
      checkpoints.current = buildEvenCheckpoints(path, length);
      if (locked.current && rootRef.current && panelRef.current) {
        rootRef.current.style.height = `${panelRef.current.offsetHeight}px`;
      }
    };

    measure();
    visualProgress.current = 0;
    scrollTarget.current = 0;
    rawProgress.current = 0;
    activeStepRef.current = 0;
    setActiveStep(0);
    travelDir.current = 1;
    flipAngle.current = 0;
    placePlane(0, 0);

    const syncProgressToScrollPosition = () => {
      const root = rootRef.current;
      if (!root || locked.current) return;

      const rect = root.getBoundingClientRect();
      // Fully past the section (below) → journey complete + hold consumed
      if (rect.bottom <= HEADER_OFFSET_PX) {
        rawProgress.current = 1;
        scrollTarget.current = 1;
        visualProgress.current = 1;
        placePlane(1, flipAngle.current);
        return;
      }
      // Fully above the section → journey at start
      if (rect.top >= window.innerHeight) {
        rawProgress.current = 0;
        scrollTarget.current = 0;
        visualProgress.current = 0;
        placePlane(0, flipAngle.current);
      }
    };

    const onWheel = (event: WheelEvent) => {
      const root = rootRef.current;
      if (!root) return;

      const rect = root.getBoundingClientRect();
      const pinLine = centerPinTop(rect.height);
      const delta = event.deltaY;
      const raw = rawProgress.current;
      const range = Math.max(1, window.innerHeight * WHEEL_RANGE_VIEWPORTS);

      // Capture when the section reaches the vertical middle of the screen
      const approachingDown =
        delta > 0 &&
        rect.top <= pinLine + 48 &&
        rect.top > pinLine - OVERSHOOT_PX &&
        rect.bottom > pinLine + 48;
      const approachingUp =
        delta < 0 &&
        rect.top <= pinLine + 8 &&
        rect.top > pinLine - OVERSHOOT_PX &&
        rect.bottom > pinLine + 48;

      if (!locked.current) {
        // Fast overshoot past the pin — finish the journey, don't yank the page back
        if (
          delta > 0 &&
          raw < 1 &&
          rect.top < pinLine - OVERSHOOT_PX &&
          rect.bottom > 0
        ) {
          rawProgress.current = 1;
          scrollTarget.current = 1;
          return;
        }

        if (approachingDown && raw < 1) {
          event.preventDefault();
          lockSection();
          const nextRaw = clamp(raw + delta / range, 0, 1);
          rawProgress.current = nextRaw;
          scrollTarget.current = planeFromRaw(nextRaw);
          return;
        }

        if (approachingUp && raw > 0) {
          event.preventDefault();
          lockSection();
          const nextRaw = clamp(raw + delta / range, 0, 1);
          rawProgress.current = nextRaw;
          scrollTarget.current = planeFromRaw(nextRaw);
        }
        return;
      }

      // Locked: page is frozen via body fixed; wheel drives the plane + read margin
      event.preventDefault();
      event.stopPropagation();
      const nextRaw = clamp(raw + delta / range, 0, 1);
      rawProgress.current = nextRaw;
      scrollTarget.current = planeFromRaw(nextRaw);

      // Release only after the read margin; never mid-path
      if (nextRaw >= 0.999 && delta > 0 && raw < 0.999) {
        // Reached the end on this tick — keep locked until a further nudge
        rawProgress.current = 1;
        return;
      }
      if (nextRaw >= 1 && delta > 0 && raw >= 0.999) {
        unlockSection();
      } else if (nextRaw <= 0 && delta < 0 && raw <= 0.001) {
        unlockSection();
      } else if (nextRaw <= 0.001 && delta < 0 && raw > 0.001) {
        rawProgress.current = 0;
      }
    };

    const onScroll = () => {
      // While locked, body is position:fixed — no scrollTo fight / snap-back
      if (locked.current) return;
      syncProgressToScrollPosition();
    };

    const onResize = () => {
      measure();
      placePlane(visualProgress.current, flipAngle.current);
      if (locked.current && rootRef.current && panelRef.current) {
        const root = rootRef.current;
        const panel = panelRef.current;
        root.style.height = `${panel.offsetHeight}px`;
        panel.style.top = `${centerPinTop(panel.offsetHeight)}px`;
      }
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    const tick = () => {
      const target = scrollTarget.current;
      let current = visualProgress.current;
      const previous = current;

      if (reducedMotion.current) {
        current = target;
      } else {
        const delta = target - current;
        if (Math.abs(delta) < SNAP_EPS) current = target;
        else current = lerp(current, target, SCROLL_SMOOTHING);
      }

      const motionDelta = current - previous;
      if (motionDelta > DIRECTION_EPS) travelDir.current = 1;
      else if (motionDelta < -DIRECTION_EPS) travelDir.current = -1;

      const flipTarget = travelDir.current < 0 ? 180 : 0;
      if (reducedMotion.current) {
        flipAngle.current = flipTarget;
      } else if (Math.abs(flipAngle.current - flipTarget) < 0.35) {
        flipAngle.current = flipTarget;
      } else {
        flipAngle.current = lerp(flipAngle.current, flipTarget, FLIP_SMOOTHING);
      }

      visualProgress.current = current;
      placePlane(current, flipAngle.current);

      const liveStep = stepFromProgress(current);
      if (liveStep !== activeStepRef.current) {
        activeStepRef.current = liveStep;
        setActiveStep(liveStep);
      }

      rafId.current = requestAnimationFrame(tick);
    };

    rafId.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafId.current);
      unlockSection();
    };
  }, [
    isDesktop,
    placePlane,
    stepFromProgress,
    lockSection,
    unlockSection,
    planeFromRaw,
  ]);

  useEffect(() => {
    if (isDesktop) return;

    const items = Array.from(
      document.querySelectorAll<HTMLElement>("[data-mobile-step]"),
    );
    if (items.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) =>
              Math.abs(a.boundingClientRect.top) -
              Math.abs(b.boundingClientRect.top),
          );
        const top = visible[0];
        if (!top) return;
        const index = Number(
          (top.target as HTMLElement).dataset.mobileStep ?? 0,
        );
        setActiveStep(index);
      },
      { rootMargin: "-35% 0px -45% 0px", threshold: 0.2 },
    );

    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, [isDesktop]);

  return (
    <section
      id="como-funciona"
      ref={rootRef}
      className={[styles.scrollRoot, isLocked ? styles.scrollLocked : ""]
        .filter(Boolean)
        .join(" ")}
      aria-labelledby="como-funciona-title"
      data-journey-locked={isLocked ? "true" : "false"}
    >
      <div
        ref={panelRef}
        className={[styles.panel, isLocked ? styles.panelFixed : ""]
          .filter(Boolean)
          .join(" ")}
      >
        <div className={`${siteStyles.sectionInner} ${styles.header}`}>
          <h2 id="como-funciona-title" className={siteStyles.sectionTitle}>
            Como funciona
          </h2>
          <p className={siteStyles.sectionLead}>
            Três passos simples para ter a plataforma a trabalhar pela sua
            equipa.
          </p>
        </div>

        <div className={styles.stage} hidden={!isDesktop}>
          <div ref={trackRef} className={styles.track}>
            <svg
              className={styles.svg}
              viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
              preserveAspectRatio="none"
              role="img"
              aria-label="Percurso de descolagem pelos três passos TravelPlus"
            >
              <path ref={pathRef} className={styles.pathBase} d={PATH_D} />
              <path
                ref={progressPathRef}
                className={styles.pathProgress}
                d={PATH_D}
              />
            </svg>

            {DEFAULT_CHECKPOINTS.map((stop, index) => (
              <span
                key={`checkpoint-${stop}`}
                ref={(node) => {
                  markersRef.current[index] = node;
                }}
                className={styles.checkpoint}
                aria-hidden
              />
            ))}

            <div ref={planeRef} className={styles.plane} aria-hidden>
              <FaPlaneUp size={36} color="currentColor" />
            </div>

            <ol className={styles.steps}>
              {STEPS.map((item, index) => {
                const isActive = activeStep === index;
                const last = index === STEPS.length - 1;
                return (
                  <li
                    key={item.step}
                    ref={(node) => {
                      stepRefs.current[index] = node;
                    }}
                    className={[
                      styles.step,
                      !last ? styles.stepAlignStart : "",
                      last ? styles.stepAlignEnd : "",
                      isActive ? styles.stepRevealed : styles.stepUpcoming,
                      isActive ? styles.stepActive : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <h3 className={styles.stepHeading}>
                      <span className={styles.stepNumber}>{item.step}</span>
                      <span className={styles.stepTitleText}>{item.title}</span>
                    </h3>
                    <p className={styles.stepBody}>{item.body}</p>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>

        <ol className={styles.mobileList} hidden={isDesktop}>
          {STEPS.map((item, index) => (
            <li
              key={item.step}
              data-mobile-step={index}
              className={[
                styles.mobileItem,
                index === activeStep ? styles.mobileItemActive : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className={styles.mobileRail}>
                <span className={styles.mobileDot} />
              </div>
              <div className={styles.mobileCopy}>
                <h3 className={styles.stepHeading}>
                  <span className={styles.stepNumber}>{item.step}</span>
                  <span className={styles.stepTitleText}>{item.title}</span>
                </h3>
                <p className={styles.stepBody}>{item.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

"use client";

import siteStyles from "@/app/site.module.css";
import {
  claimPageScroll,
  releasePageScroll,
  requestPageSnap,
} from "@/lib/pageScrollClaim";
import { STEPS } from "@/lib/site-data";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { FaPlaneUp } from "react-icons/fa6";
import styles from "./StepsJourney.module.css";

/**
 * Fallback connector path (viewBox 0 0 2400 420).
 * Rebuilt on measure so checkpoints sit under each step's content centre.
 */
const PATH_D = "M 400 310 C 900 310 1500 110 2000 110";
const PATH_Y = [310, 210, 110] as const;

/** Defaults; recalculated on measure from each step's horizontal centre */
const DEFAULT_CHECKPOINTS = [0, 0.5, 1] as const;

const SCROLL_SMOOTHING = 0.045;
/** Stronger lerp on the last leg so the plane does not crawl into the finish */
const END_SMOOTHING = 0.12;
/** Progress from which the finish boost ramps up (last ~28% of the path) */
const FINISH_BOOST_FROM = 0.72;
const SNAP_EPS = 0.0008;
const END_SNAP_EPS = 0.004;
const FLIP_SMOOTHING = 0.12;
const DIRECTION_EPS = 0.00015;
const PLANE_ANGLE_OFFSET = 90;
const VIEWBOX_W = 2400;
const VIEWBOX_H = 420;
const STEP_LAST = STEPS.length - 1;
const WHEEL_TOLERANCE = 16;
/** Brief pause after the flight before releasing the section lock */
const END_STEP_HOLD_MS = 180;
/** Path animation + wheel lock only from this width up (tablets stay on mobile layout) */
const DESKTOP_MIN_WIDTH_PX = 1024;
const SNAP_ID = "como-funciona";

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

/** Smooth climb through three step-centre X positions in viewBox space. */
function buildConnectorPath(x0: number, x1: number, x2: number) {
  const [y0, y1, y2] = PATH_Y;
  const c01 = (x0 + x1) / 2;
  const c12 = (x1 + x2) / 2;
  return `M ${x0} ${y0} C ${c01} ${y0}, ${c01} ${y1}, ${x1} ${y1} C ${c12} ${y1}, ${c12} ${y2}, ${x2} ${y2}`;
}

function buildCheckpointsAtXs(
  path: SVGPathElement,
  length: number,
  xs: [number, number, number],
) {
  return [
    progressAtX(path, length, xs[0]),
    progressAtX(path, length, xs[1]),
    progressAtX(path, length, xs[2]),
  ] as [number, number, number];
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
  const pathLength = useRef(0);
  const checkpoints = useRef<[number, number, number]>([...DEFAULT_CHECKPOINTS]);
  const reducedMotion = useRef(false);
  const rafId = useRef(0);
  const activeStepRef = useRef(0);
  const travelDir = useRef<1 | -1>(1);
  const flipAngle = useRef(0);
  const locked = useRef(false);
  const lockScrollY = useRef(0);
  const animatingRef = useRef(false);
  const armedRef = useRef(true);
  /** After the first full flight, keep the completed path/steps and never replay */
  const journeyDoneRef = useRef(false);
  const finishTimerRef = useRef(0);

  const [activeStep, setActiveStep] = useState(0);
  // Mobile-first: assume non-desktop until matchMedia runs (avoids path/lock under 1024px)
  const [isDesktop, setIsDesktop] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  /** Path animation only when desktop can animate; reduced-motion gets the static list. */
  const showPath = isDesktop && !reduceMotion;

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

      markers.forEach((marker, index) => {
        const point = path.getPointAtLength(marker * length);
        const local = pathPointToTrack(point.x, point.y);
        if (!local) return;

        const checkpoint = markersRef.current[index];
        if (!checkpoint) return;

        const reached = progress + 0.01 >= marker;
        const onStop = Math.abs(progress - marker) < 0.028;
        checkpoint.style.transform = `translate(${local.x}px, ${local.y}px) translate(-50%, -50%)${
          reached ? " scale(1)" : " scale(0.7)"
        }`;
        checkpoint.classList.toggle(styles.checkpointVisible, reached);
        checkpoint.classList.toggle(styles.checkpointReached, reached);
        checkpoint.classList.toggle(styles.checkpointActive, onStop);
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
        progressPath.style.strokeDasharray = `${length}`;
        progressPath.style.strokeDashoffset = `${length - distance}`;
      }

      placeAnchors(progress);
    },
    [pathPointToTrack, placeAnchors],
  );

  const freezePageScroll = useCallback((scrollY: number) => {
    const body = document.body;
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
    const targetY = window.scrollY + rect.top - pinTop;

    root.style.height = `${panel.offsetHeight}px`;
    panel.style.top = `${pinTop}px`;
    freezePageScroll(targetY);
    locked.current = true;
    claimPageScroll("journey");
    setIsLocked(true);
  }, [freezePageScroll]);

  const unlockSection = useCallback(
    (direction?: 1 | -1) => {
      const root = rootRef.current;
      const panel = panelRef.current;
      if (!root || !locked.current) return;

      locked.current = false;
      armedRef.current = false;
      animatingRef.current = false;
      setIsLocked(false);
      root.style.height = "";
      if (panel) panel.style.top = "";
      releasePageScroll("journey");
      unfreezePageScroll();
      if (direction) {
        requestPageSnap(direction, SNAP_ID);
      }
    },
    [unfreezePageScroll],
  );

  useLayoutEffect(() => {
    const media = window.matchMedia(`(min-width: ${DESKTOP_MIN_WIDTH_PX}px)`);
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const applyMedia = () => setIsDesktop(media.matches);
    const applyMotion = () => {
      const matches = motion.matches;
      reducedMotion.current = matches;
      setReduceMotion(matches);
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
    if (!path || !showPath) {
      unlockSection();
      return;
    }

    const measure = () => {
      const track = trackRef.current;
      const progressPath = progressPathRef.current;
      if (!track) return;

      const trackRect = track.getBoundingClientRect();
      if (trackRect.width <= 0) return;

      const xs: number[] = [];
      for (let i = 0; i < STEPS.length; i += 1) {
        const step = stepRefs.current[i];
        if (!step) return;
        const rect = step.getBoundingClientRect();
        const centerPx = rect.left + rect.width / 2 - trackRect.left;
        xs.push(clamp((centerPx / trackRect.width) * VIEWBOX_W, 0, VIEWBOX_W));
      }
      if (xs.length !== 3) return;

      const d = buildConnectorPath(xs[0], xs[1], xs[2]);
      path.setAttribute("d", d);
      progressPath?.setAttribute("d", d);

      const length = path.getTotalLength();
      pathLength.current = length;
      checkpoints.current = buildCheckpointsAtXs(
        path,
        length,
        xs as [number, number, number],
      );

      if (locked.current && rootRef.current && panelRef.current) {
        rootRef.current.style.height = `${panelRef.current.offsetHeight}px`;
      }
    };

    const progressForStep = (index: number) => {
      const marks = checkpoints.current;
      return marks[clamp(index, 0, marks.length - 1)] ?? 0;
    };

    const clearFinishTimer = () => {
      window.clearTimeout(finishTimerRef.current);
      finishTimerRef.current = 0;
    };

    const showCompletedJourney = () => {
      const progress = progressForStep(STEP_LAST);
      activeStepRef.current = STEP_LAST;
      setActiveStep(STEP_LAST);
      visualProgress.current = progress;
      scrollTarget.current = progress;
      travelDir.current = 1;
      flipAngle.current = 0;
      animatingRef.current = false;
      placePlane(progress, 0);
    };

    const finishJourney = () => {
      if (journeyDoneRef.current) return;
      journeyDoneRef.current = true;
      clearFinishTimer();
      finishTimerRef.current = window.setTimeout(() => {
        finishTimerRef.current = 0;
        if (locked.current) unlockSection();
      }, END_STEP_HOLD_MS);
    };

    /** Sync the active step label with how far the plane has flown. */
    const syncStepFromProgress = (progress: number) => {
      const marks = checkpoints.current;
      let stepIndex = 0;
      for (let i = 0; i < marks.length; i += 1) {
        if (progress + 0.01 >= marks[i]) stepIndex = i;
      }
      if (activeStepRef.current !== stepIndex) {
        activeStepRef.current = stepIndex;
        setActiveStep(stepIndex);
      }
    };

    /** Start the one-shot flight from the beginning to the last checkpoint. */
    const startJourneyFlight = () => {
      clearFinishTimer();
      journeyDoneRef.current = false;
      travelDir.current = 1;
      flipAngle.current = 0;

      if (reducedMotion.current) {
        showCompletedJourney();
        finishJourney();
        return;
      }

      visualProgress.current = 0;
      scrollTarget.current = progressForStep(STEP_LAST);
      activeStepRef.current = 0;
      setActiveStep(0);
      animatingRef.current = true;
      placePlane(0, 0);
    };

    measure();
    animatingRef.current = false;
    armedRef.current = true;
    clearFinishTimer();

    if (journeyDoneRef.current) {
      showCompletedJourney();
    } else {
      visualProgress.current = 0;
      scrollTarget.current = 0;
      activeStepRef.current = 0;
      setActiveStep(0);
      travelDir.current = 1;
      flipAngle.current = 0;
      placePlane(0, 0);
    }

    const onWheel = (event: WheelEvent) => {
      if (!locked.current) return;
      event.preventDefault();
      event.stopPropagation();

      // During the one-shot flight, swallow wheel so the plane finishes alone.
      if (!journeyDoneRef.current || animatingRef.current) return;

      if (Math.abs(event.deltaY) < WHEEL_TOLERANCE) return;
      unlockSection(event.deltaY > 0 ? 1 : -1);
    };

    const onArrive = (event: Event) => {
      const id = (event as CustomEvent<{ id: string }>).detail?.id;
      if (id !== SNAP_ID) return;

      // Already played: keep the completed scene visible, no lock / no replay.
      if (journeyDoneRef.current) {
        showCompletedJourney();
        if (locked.current) unlockSection();
        return;
      }

      if (!locked.current) lockSection();
      armedRef.current = false;
      startJourneyFlight();
      requestAnimationFrame(() => {
        armedRef.current = true;
      });
    };

    const onNavStep = (event: Event) => {
      const detail = (event as CustomEvent<{ direction: 1 | -1 }>).detail;
      if (!detail || !locked.current) return;
      // Only allow leaving after the one-shot flight has finished.
      if (!journeyDoneRef.current || animatingRef.current) return;
      unlockSection(detail.direction);
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
    window.addEventListener("resize", onResize);
    window.addEventListener("tp-section-arrive", onArrive);
    window.addEventListener("tp-nav-step", onNavStep);

    const resizeObserver = new ResizeObserver(onResize);
    const stepsEl = stepRefs.current[0]?.parentElement;
    if (stepsEl) resizeObserver.observe(stepsEl);
    const trackEl = trackRef.current;
    if (trackEl) resizeObserver.observe(trackEl);

    const tick = () => {
      const target = scrollTarget.current;
      let current = visualProgress.current;
      const previous = current;

      if (reducedMotion.current) {
        current = target;
        if (animatingRef.current) {
          animatingRef.current = false;
          syncStepFromProgress(current);
          if (current >= progressForStep(STEP_LAST) - SNAP_EPS) {
            finishJourney();
          }
        }
      } else {
        const delta = target - current;
        const finishing =
          target >= progressForStep(STEP_LAST) - SNAP_EPS &&
          current >= FINISH_BOOST_FROM;
        const snapEps = finishing ? END_SNAP_EPS : SNAP_EPS;
        let smoothing = SCROLL_SMOOTHING;
        if (finishing) {
          const t = clamp(
            (current - FINISH_BOOST_FROM) / (1 - FINISH_BOOST_FROM),
            0,
            1,
          );
          smoothing = lerp(SCROLL_SMOOTHING, END_SMOOTHING, t * t);
        }

        if (Math.abs(delta) < snapEps) {
          current = target;
          if (animatingRef.current) {
            animatingRef.current = false;
            syncStepFromProgress(current);
            if (current >= progressForStep(STEP_LAST) - SNAP_EPS) {
              finishJourney();
            }
          }
        } else {
          current = lerp(current, target, smoothing);
          syncStepFromProgress(current);
        }
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

      rafId.current = requestAnimationFrame(tick);
    };

    rafId.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("tp-section-arrive", onArrive);
      window.removeEventListener("tp-nav-step", onNavStep);
      resizeObserver.disconnect();
      cancelAnimationFrame(rafId.current);
      clearFinishTimer();
      unlockSection();
    };
  }, [showPath, placePlane, lockSection, unlockSection]);

  useEffect(() => {
    if (showPath) return;

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
  }, [showPath]);

  return (
    <section
      id="como-funciona"
      ref={rootRef}
      className={[styles.scrollRoot, isLocked ? styles.scrollLocked : ""]
        .filter(Boolean)
        .join(" ")}
      aria-labelledby="como-funciona-title"
      data-journey-locked={isLocked ? "true" : "false"}
      data-snap-section
      data-snap-id={SNAP_ID}
      data-snap-align="center"
      data-snap-interactive={showPath ? "true" : undefined}
      data-static={!showPath ? "true" : undefined}
    >
      <div
        ref={panelRef}
        className={[styles.panel, isLocked ? styles.panelFixed : ""]
          .filter(Boolean)
          .join(" ")}
      >
        {showPath ? (
          <>
            <div className={`${siteStyles.sectionInner} ${styles.header}`}>
              <h2 id="como-funciona-title" className={siteStyles.sectionTitle}>
                Como funciona
              </h2>
              <p className={siteStyles.sectionLead}>
                Três passos simples para ter a plataforma a trabalhar pela sua
                equipa.
              </p>
            </div>

            <div className={styles.stage}>
              <ol className={styles.steps}>
                {STEPS.map((item, index) => {
                  const isActive = activeStep === index;
                  const isRevealed = index <= activeStep;
                  return (
                    <li
                      key={item.step}
                      ref={(node) => {
                        stepRefs.current[index] = node;
                      }}
                      className={[
                        styles.step,
                        isRevealed ? styles.stepRevealed : styles.stepUpcoming,
                        isActive ? styles.stepActive : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <h3 className={styles.stepHeading}>
                        <span className={styles.stepNumber}>{item.step}</span>
                        <span className={styles.stepTitleText}>
                          {item.title}
                        </span>
                      </h3>
                      <p className={styles.stepBody}>{item.body}</p>
                    </li>
                  );
                })}
              </ol>

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
              </div>
            </div>
          </>
        ) : (
          <div className={`${siteStyles.sectionInner} ${styles.staticBlock}`}>
            <div className={styles.header}>
              <h2 id="como-funciona-title" className={siteStyles.sectionTitle}>
                Como funciona
              </h2>
              <p className={siteStyles.sectionLead}>
                Três passos simples para ter a plataforma a trabalhar pela sua
                equipa.
              </p>
            </div>

            <ol className={styles.mobileList}>
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
        )}
      </div>
    </section>
  );
}

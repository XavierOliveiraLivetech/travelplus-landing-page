"use client";

import siteStyles from "@/app/site.module.css";
import { FEATURES } from "@/lib/site-data";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";
import { useSectionActive } from "@/lib/useSectionActive";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { LuPause, LuPlay } from "react-icons/lu";
import { type FeatureId, FeatureVisual } from "./FeatureVisuals";
import { StepSequence } from "./StepVisuals";
import styles from "./FeaturesDial.module.css";
import motionStyles from "./MotionToggle.module.css";

const GlobeFlight = dynamic(
  () => import("./GlobeFlight").then((mod) => mod.GlobeFlight),
  { ssr: false },
);

gsap.registerPlugin(useGSAP);

/* Bento slots: which feature goes where (slot order = visual order). */
const BENTO: FeatureId[] = ["widget", "operadores", "cliente", "orcamentos", "gestao"];

/* Below desktop the CSS moves orçamentos after gestão (FeaturesDial.module.css,
 * `order: 1`); the demos take their turns in that same visual order. */
const COMPACT_QUERY = "(max-width: 1023px)";
const BENTO_COMPACT: FeatureId[] = ["widget", "operadores", "cliente", "gestao", "orcamentos"];

function subscribeCompact(onChange: () => void) {
  const mq = window.matchMedia(COMPACT_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/** True below 1024px. Follows live changes; the server render assumes desktop. */
function useCompactBento() {
  return useSyncExternalStore(
    subscribeCompact,
    () => window.matchMedia(COMPACT_QUERY).matches,
    () => false,
  );
}

/* ——— Wireframe globe geometry (viewBox 0 0 400 400) ——— */
const R = 170;
const C = 200;
const MERIDIANS = 6;
const PARALLELS = [-60, -30, 0, 30, 60].map((lat) => {
  const rad = (lat * Math.PI) / 180;
  return { y: C - R * Math.sin(rad), half: R * Math.cos(rad) };
});
function Globe() {
  return (
    <svg className={styles.globe} viewBox="0 0 400 400" aria-hidden="true">
      <defs>
        <radialGradient id="globeFill" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="55%" stopColor="#efe6ff" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#ffd9bb" stopOpacity="0.6" />
        </radialGradient>
      </defs>
      <circle cx={C} cy={C} r={R} className={styles.globeBody} />
      <g className={styles.globeGrid}>
        {PARALLELS.map((p) => (
          <line
            key={p.y}
            x1={C - p.half}
            x2={C + p.half}
            y1={p.y}
            y2={p.y}
          />
        ))}
        {Array.from({ length: MERIDIANS }, (_, i) => (
          <ellipse
            key={i}
            data-meridian={i}
            cx={C}
            cy={C}
            rx={R * Math.abs(Math.cos((i * Math.PI) / MERIDIANS))}
            ry={R}
          />
        ))}
      </g>
    </svg>
  );
}

export function FeaturesDial() {
  const rootRef = useRef<HTMLElement | null>(null);
  const reduced = usePrefersReducedMotion();
  const compact = useCompactBento();
  const [paused, setPaused] = useState(false);
  const spinRef = useRef<gsap.core.Tween | null>(null);
  const globeRef = useRef<HTMLDivElement | null>(null);
  // Only spin / render the WebGL globe while it is actually on screen
  // (scrolled into view).
  const globeOnScreen = useSectionActive(globeRef, 0.1);
  const idle = paused || !globeOnScreen;

  /* ——— Globe: meridians spinning while the 3D plane laps the sphere ———
   * Reduced motion: globe and plane stay still. Otherwise a click on the
   * globe pauses / resumes both (WCAG 2.2.2: looping motion can be stopped). */
  useGSAP(
    () => {
      if (reduced) return;
      const meridians = Array.from(
        rootRef.current?.querySelectorAll<SVGEllipseElement>(
          "[data-meridian]",
        ) ?? [],
      );
      const spin = { a: 0 };
      spinRef.current = gsap.to(spin, {
        a: Math.PI,
        duration: 28,
        repeat: -1,
        ease: "none",
        paused: idle,
        onUpdate: () => {
          meridians.forEach((m, i) => {
            const angle = spin.a + (i * Math.PI) / MERIDIANS;
            m.setAttribute("rx", (R * Math.abs(Math.cos(angle))).toFixed(2));
          });
        },
      });
      return () => {
        spinRef.current = null;
      };
    },
    // `idle` is applied below without restarting the spin.
    { scope: rootRef, dependencies: [reduced], revertOnUpdate: true },
  );

  useEffect(() => {
    spinRef.current?.paused(idle);
  }, [idle]);

  return (
    <section
      ref={rootRef}
      id="produto-features"
      className={styles.section}
      aria-labelledby="features-title"
    >
      <div className={`${siteStyles.sectionInner} ${styles.inner}`}>
        {/* One reveal for title + globe so they fade in together; the globe's
            spin (useSectionActive) waits for that reveal too. */}
        <div className={styles.headRow} data-reveal>
          {/* Globe first in the DOM so it can float beside the title on phones */}
          <div ref={globeRef} className={styles.globeWrap}>
            {reduced ? (
              <div className={styles.globeStage}>
                <Globe />
                <GlobeFlight reduced paused={false} />
              </div>
            ) : (
              <button
                type="button"
                className={`${styles.globeStage} ${styles.globeToggle}`}
                aria-pressed={paused}
                aria-label={
                  paused
                    ? "Retomar a animação do globo"
                    : "Pausar a animação do globo"
                }
                title={paused ? "Retomar animação" : "Pausar animação"}
                onClick={() => setPaused((p) => !p)}
              >
                <Globe />
                <GlobeFlight reduced={false} paused={idle} />
                {/* Visible cue that the looping motion can be stopped */}
                <span
                  className={`${motionStyles.badge} ${styles.globeControl}`}
                  aria-hidden="true"
                >
                  {paused ? <LuPlay /> : <LuPause />}
                </span>
              </button>
            )}
          </div>
          <header className={styles.header}>
            <h2 id="features-title" className={siteStyles.sectionTitle}>
              Tudo o que a agência precisa num só sítio
            </h2>
            <p className={siteStyles.sectionLead}>
              Do primeiro contacto com o cliente até à reserva confirmada - sem
              mudar de ferramenta a meio do processo.
            </p>
          </header>
        </div>

        {/* Features are parallel capabilities, not a sequence: an unordered
            bento (desktop rows 3 + 2). Card demos follow the "Como funciona"
            rules (StepSequence): a card plays once it is almost fully in view
            and after any earlier card still playing beside it. */}
        <StepSequence mode="independent">
          <ul className={styles.grid}>
            {BENTO.map((id) => {
              // Turn order = the order the cards are laid out in
              const index = (compact ? BENTO_COMPACT : BENTO).indexOf(id);
              const feature = FEATURES.find((f) => f.id === id);
              if (!feature) return null;
              return (
                <li
                  key={id}
                  className={styles.card}
                  data-slot={id}
                  data-title="top"
                  data-feature-card
                  data-reveal
                >
                  <div className={styles.copy}>
                    <h3 className={styles.title}>{feature.title}</h3>
                    <p className={styles.body}>{feature.body}</p>
                  </div>
                  <FeatureVisual id={id} index={index} />
                </li>
              );
            })}
          </ul>
        </StepSequence>
      </div>
    </section>
  );
}

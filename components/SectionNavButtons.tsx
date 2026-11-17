"use client";

import { requestNavStep } from "@/lib/pageScrollClaim";
import { useEffect, useState } from "react";
import { FaChevronDown, FaChevronUp } from "react-icons/fa6";
import styles from "./SectionNavButtons.module.css";

const DESKTOP_MIN_WIDTH_PX = 1024;

function snapTargets(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>("[data-snap-section]"),
  );
}

function nearestIndex(sections: HTMLElement[]) {
  const probe = window.scrollY + window.innerHeight * 0.45;
  let best = 0;
  let bestDist = Number.POSITIVE_INFINITY;

  sections.forEach((el, i) => {
    const top = window.scrollY + el.getBoundingClientRect().top;
    const mid = top + el.offsetHeight / 2;
    const dist = Math.abs(mid - probe);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  });

  return best;
}

export function SectionNavButtons() {
  const [visible, setVisible] = useState(false);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  useEffect(() => {
    const desktopMq = window.matchMedia(
      `(min-width: ${DESKTOP_MIN_WIDTH_PX}px)`,
    );
    const motionMq = window.matchMedia("(prefers-reduced-motion: reduce)");

    const syncVisibility = () => {
      setVisible(desktopMq.matches && !motionMq.matches);
    };

    const syncEnds = () => {
      const sections = snapTargets();
      if (sections.length === 0) {
        setAtStart(true);
        setAtEnd(true);
        return;
      }
      const index = nearestIndex(sections);
      setAtStart(index <= 0);
      setAtEnd(index >= sections.length - 1);
    };

    syncVisibility();
    syncEnds();

    desktopMq.addEventListener("change", syncVisibility);
    motionMq.addEventListener("change", syncVisibility);
    window.addEventListener("scroll", syncEnds, { passive: true });
    window.addEventListener("tp-section-arrive", syncEnds);

    return () => {
      desktopMq.removeEventListener("change", syncVisibility);
      motionMq.removeEventListener("change", syncVisibility);
      window.removeEventListener("scroll", syncEnds);
      window.removeEventListener("tp-section-arrive", syncEnds);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className={styles.nav} role="group" aria-label="Navegação entre secções">
      <button
        type="button"
        className={styles.button}
        aria-label="Secção anterior"
        disabled={atStart}
        onClick={() => requestNavStep(-1)}
      >
        <FaChevronUp className={styles.icon} aria-hidden />
      </button>
      <button
        type="button"
        className={styles.button}
        aria-label="Secção seguinte"
        disabled={atEnd}
        onClick={() => requestNavStep(1)}
      >
        <FaChevronDown className={styles.icon} aria-hidden />
      </button>
    </div>
  );
}

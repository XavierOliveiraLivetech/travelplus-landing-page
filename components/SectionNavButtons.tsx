"use client";

import {
  nearestIndex,
  requestNavStep,
  snapTargets,
} from "@/lib/pageScrollClaim";
import { useStoryMode } from "@/lib/usePrefersReducedMotion";
import { useEffect, useState } from "react";
import { FaChevronDown, FaChevronUp } from "react-icons/fa6";
import styles from "./SectionNavButtons.module.css";

export function SectionNavButtons() {
  const visible = useStoryMode();
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  // Only track the scroll position while the buttons are on screen.
  useEffect(() => {
    if (!visible) return;

    const syncEnds = () => {
      const sections = snapTargets();
      if (sections.length === 0) {
        setAtStart(true);
        setAtEnd(true);
        return;
      }

      // Full-page story: the buttons follow the section the story is showing.
      const story = document.querySelector<HTMLElement>(
        "[data-story-bridge][data-flight-active]",
      );
      if (story?.dataset.storyCount) {
        const index = Number(story.dataset.storyIndex ?? 0);
        const count = Number(story.dataset.storyCount);
        setAtStart(index <= 0);
        setAtEnd(index >= count - 1);
        return;
      }

      if (story || sections.length === 1) {
        const maxScroll = Math.max(
          0,
          document.documentElement.scrollHeight - window.innerHeight,
        );
        setAtStart(window.scrollY <= 48);
        setAtEnd(window.scrollY >= maxScroll - 48);
        return;
      }

      const index = nearestIndex(sections);
      setAtStart(index <= 0);
      setAtEnd(index >= sections.length - 1);
    };

    syncEnds();
    window.addEventListener("scroll", syncEnds, { passive: true });
    window.addEventListener("tp-section-arrive", syncEnds);

    return () => {
      window.removeEventListener("scroll", syncEnds);
      window.removeEventListener("tp-section-arrive", syncEnds);
    };
  }, [visible]);

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

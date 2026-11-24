"use client";

import siteStyles from "@/app/site.module.css";
import { STEPS } from "@/lib/site-data";
import { useLayoutEffect } from "react";
import { StepSequence, StepVisual } from "./StepVisuals";
import { StepsPlaneFlight } from "./StepsPlaneFlight";
import styles from "./StepsJourney.module.css";

function syncStepCardHeights(root: ParentNode) {
  const cards = Array.from(
    root.querySelectorAll<HTMLElement>("[data-step-card]"),
  ).filter((card) => {
    const visual = card.closest("[class*='visual']") ?? card;
    return getComputedStyle(visual).display !== "none";
  });
  if (cards.length < 2) return;

  cards.forEach((card) => {
    card.style.minHeight = "";
  });
  const max = Math.max(...cards.map((card) => card.offsetHeight));
  cards.forEach((card) => {
    card.style.minHeight = `${max}px`;
  });
}

type Step = (typeof STEPS)[number];

/** Section title + lead (each layout renders its own copy). */
function StepsIntro({ titleId }: { titleId: string }) {
  return (
    <>
      <h2 id={titleId} className={siteStyles.sectionTitle}>
        Como funciona
      </h2>
      <p className={siteStyles.sectionLead}>
        Três passos simples para ter a plataforma a trabalhar pela sua equipa.
      </p>
    </>
  );
}

/** Number, title, copy and demo card of one step. */
function StepContent({ item, index }: { item: Step; index: number }) {
  return (
    <>
      <h3 className={styles.stepHeading}>
        <span className={styles.stepNumber}>{item.step}</span>
        <span className={styles.stepTitleText}>{item.title}</span>
      </h3>
      <p className={styles.stepBody}>{item.body}</p>
      <StepVisual index={index} />
    </>
  );
}

export function StepsJourney() {
  useLayoutEffect(() => {
    const stage = document.querySelector("[data-steps-stage]");
    if (!stage) return;

    let frame = 0;
    const sync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => syncStepCardHeights(stage));
    };

    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(stage);
    stage
      .querySelectorAll("[data-step-card]")
      .forEach((card) => observer.observe(card));

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return (
    <section
      id="como-funciona"
      className={styles.scrollRoot}
      aria-labelledby="como-funciona-title"
    >
      <div className={styles.panel}>
        {/* Desktop layout: the plane reveals the cards once this whole
            block is on screen (StepsPlaneFlight). */}
        <div className={styles.desktopBlock} data-steps-flight-area>
          <div
            className={`${siteStyles.sectionInner} ${styles.header}`}
            data-reveal
          >
            <StepsIntro titleId="como-funciona-title" />
          </div>

          <div className={styles.stage} data-steps-stage>
            <StepSequence>
              <ol className={styles.steps}>
                {STEPS.map((item, index) => (
                  <li
                    key={item.step}
                    className={styles.step}
                    data-step-item
                    data-reveal-gate
                  >
                    <StepContent item={item} index={index} />
                  </li>
                ))}
              </ol>
            </StepSequence>
          </div>
        </div>

        {/* Mobile layout */}
        <div className={`${siteStyles.sectionInner} ${styles.staticBlock}`}>
          <div className={styles.header} data-reveal>
            <StepsIntro titleId="como-funciona-title-mobile" />
          </div>

          {/* Stacked list taller than the screen: each card plays on its own */}
          <StepSequence mode="independent">
            <ol className={styles.mobileList}>
              {STEPS.map((item, index) => (
                <li key={item.step} data-reveal className={styles.mobileItem}>
                  <div className={styles.mobileRail}>
                    <span className={styles.mobileDot} />
                  </div>
                  <div className={styles.mobileCopy}>
                    <StepContent item={item} index={index} />
                  </div>
                </li>
              ))}
            </ol>
          </StepSequence>
        </div>
      </div>

      <StepsPlaneFlight />
    </section>
  );
}

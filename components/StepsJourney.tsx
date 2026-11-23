"use client";

import siteStyles from "@/app/site.module.css";
import { STEPS } from "@/lib/site-data";
import { useLayoutEffect } from "react";
import { StepSequence, StepVisual } from "./StepVisuals";
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
      data-story-section="skills"
    >
      <div className={styles.panel}>
        {/* Desktop layout — always mounted so scrollytelling can target steps */}
        <div className={styles.desktopBlock}>
          <div className={`${siteStyles.sectionInner} ${styles.header}`}>
            <h2 id="como-funciona-title" className={siteStyles.sectionTitle}>
              Como funciona
            </h2>
            <p className={siteStyles.sectionLead}>
              Três passos simples para ter a plataforma a trabalhar pela sua
              equipa.
            </p>
          </div>

          <div className={styles.stage} data-steps-stage>
            <StepSequence>
              <ol className={styles.steps}>
                {STEPS.map((item, index) => (
                  <li
                    key={item.step}
                    className={styles.step}
                    data-step-item
                    data-flight-index={index}
                  >
                    <h3 className={styles.stepHeading}>
                      <span className={styles.stepNumber}>{item.step}</span>
                      <span className={styles.stepTitleText}>{item.title}</span>
                    </h3>
                    <p className={styles.stepBody}>{item.body}</p>
                    <StepVisual index={index} />
                  </li>
                ))}
              </ol>
            </StepSequence>
          </div>
        </div>

        {/* Mobile layout */}
        <div className={`${siteStyles.sectionInner} ${styles.staticBlock}`}>
          <div className={styles.header} data-reveal>
            <h2
              id="como-funciona-title-mobile"
              className={siteStyles.sectionTitle}
            >
              Como funciona
            </h2>
            <p className={siteStyles.sectionLead}>
              Três passos simples para ter a plataforma a trabalhar pela sua
              equipa.
            </p>
          </div>

          {/* Stacked list taller than the screen: each card plays on its own */}
          <StepSequence mode="independent">
            <ol className={styles.mobileList}>
              {STEPS.map((item, index) => (
                <li
                  key={item.step}
                  data-reveal
                  className={styles.mobileItem}
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
                    <StepVisual index={index} />
                  </div>
                </li>
              ))}
            </ol>
          </StepSequence>
        </div>
      </div>
    </section>
  );
}

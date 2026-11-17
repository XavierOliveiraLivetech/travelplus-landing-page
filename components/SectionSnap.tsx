"use client";

import {
  isPageScrollClaimed,
  isPageSnapLocked,
  notifySnapArrive,
} from "@/lib/pageScrollClaim";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Observer } from "gsap/Observer";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { useEffect, useState } from "react";

gsap.registerPlugin(Observer, ScrollToPlugin, useGSAP);

const DESKTOP_MIN_WIDTH_PX = 1024;
const SNAP_DURATION = 0.75;
const WHEEL_TOLERANCE = 48;

type SnapDetail = { direction: 1 | -1; fromId?: string };

function snapTargets(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>("[data-snap-section]"),
  );
}

function scrollTopFor(el: HTMLElement) {
  const align = el.dataset.snapAlign === "center" ? "center" : "start";
  const rect = el.getBoundingClientRect();
  const absoluteTop = window.scrollY + rect.top;

  if (align === "center") {
    return Math.max(
      0,
      absoluteTop - (window.innerHeight - rect.height) / 2,
    );
  }

  return Math.max(0, absoluteTop);
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

function indexForId(sections: HTMLElement[], id: string) {
  return sections.findIndex(
    (el) => el.dataset.snapId === id || el.id === id,
  );
}

export function SectionSnap() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const desktopMq = window.matchMedia(
      `(min-width: ${DESKTOP_MIN_WIDTH_PX}px)`,
    );
    const motionMq = window.matchMedia("(prefers-reduced-motion: reduce)");

    const sync = () => {
      setEnabled(desktopMq.matches && !motionMq.matches);
    };

    sync();
    desktopMq.addEventListener("change", sync);
    motionMq.addEventListener("change", sync);
    return () => {
      desktopMq.removeEventListener("change", sync);
      motionMq.removeEventListener("change", sync);
    };
  }, []);

  useGSAP(
    () => {
      if (!enabled) return;

      const html = document.documentElement;
      const previousBehavior = html.style.scrollBehavior;
      html.style.scrollBehavior = "auto";
      html.classList.add("section-snap-active");

      let index = nearestIndex(snapTargets());
      let animating = false;

      const goTo = (nextIndex: number) => {
        const sections = snapTargets();
        if (sections.length === 0 || animating) return;

        const clamped = Math.max(0, Math.min(sections.length - 1, nextIndex));
        const target = sections[clamped];
        if (!target) return;

        index = clamped;
        animating = true;

        gsap.to(window, {
          scrollTo: { y: scrollTopFor(target), autoKill: false },
          duration: SNAP_DURATION,
          ease: "power2.inOut",
          overwrite: true,
          onComplete: () => {
            animating = false;
            index = clamped;
            const id = target.dataset.snapId ?? target.id;
            if (id) notifySnapArrive(id);
          },
        });
      };

      const step = (direction: 1 | -1) => {
        if (animating || isPageScrollClaimed() || isPageSnapLocked()) return;

        const sections = snapTargets();
        if (sections.length === 0) return;

        // Prefer the tracked index; only reconcile if we drifted far.
        const nearest = nearestIndex(sections);
        if (Math.abs(nearest - index) > 1) {
          index = nearest;
        }

        const el = sections[index];

        // Interactive sections own the wheel after arrive claims scroll.
        if (el?.dataset.snapInteractive === "true") {
          const id = el.dataset.snapId ?? el.id;
          if (id) notifySnapArrive(id);
          // Claim is synchronous in arrive handlers — stand down if taken.
          if (isPageScrollClaimed()) return;
        }

        goTo(index + direction);
      };

      const observer = Observer.create({
        target: window,
        type: "wheel,touch",
        tolerance: WHEEL_TOLERANCE,
        preventDefault: false,
        onChangeY: (self) => {
          if (Math.abs(self.deltaY) < WHEEL_TOLERANCE) return;
          // deltaY > 0 → scroll down the page → next section
          step(self.deltaY > 0 ? 1 : -1);
        },
      });

      const onWheelCapture = (event: WheelEvent) => {
        if (animating || isPageSnapLocked()) {
          event.preventDefault();
          return;
        }

        // Interactive owners handle their own preventDefault.
        if (isPageScrollClaimed()) return;

        // Hold native scroll on desktop — sections step via Observer.
        event.preventDefault();
      };

      const onExternalSnap = (event: Event) => {
        const detail = (event as CustomEvent<SnapDetail>).detail;
        if (!detail) return;

        const sections = snapTargets();
        let from = index;

        if (detail.fromId) {
          const found = indexForId(sections, detail.fromId);
          if (found >= 0) from = found;
        }

        goTo(from + detail.direction);
      };

      const onNavStep = (event: Event) => {
        const detail = (event as CustomEvent<{ direction: 1 | -1 }>).detail;
        if (!detail) return;
        // Interactive owners handle this when they have claimed the page scroll.
        if (isPageScrollClaimed()) return;
        step(detail.direction);
      };

      const onScroll = () => {
        if (animating || isPageScrollClaimed() || isPageSnapLocked()) return;
        index = nearestIndex(snapTargets());
      };

      const onNavClick = (event: MouseEvent) => {
        const anchor = (event.target as Element | null)?.closest?.(
          'a[href^="#"]',
        ) as HTMLAnchorElement | null;
        if (!anchor) return;

        const id = anchor.getAttribute("href")?.slice(1);
        if (!id) return;

        const sections = snapTargets();
        const targetIndex = sections.findIndex((el) => {
          if (el.id === id || el.dataset.snapId === id) return true;
          try {
            return Boolean(el.querySelector(`#${CSS.escape(id)}`));
          } catch {
            return false;
          }
        });
        if (targetIndex < 0) return;

        event.preventDefault();
        goTo(targetIndex);
      };

      window.addEventListener("wheel", onWheelCapture, {
        passive: false,
        capture: true,
      });
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("tp-section-snap", onExternalSnap);
      window.addEventListener("tp-nav-step", onNavStep);
      document.addEventListener("click", onNavClick);

      return () => {
        html.style.scrollBehavior = previousBehavior;
        html.classList.remove("section-snap-active");
        window.removeEventListener("wheel", onWheelCapture, true);
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("tp-section-snap", onExternalSnap);
        window.removeEventListener("tp-nav-step", onNavStep);
        document.removeEventListener("click", onNavClick);
        observer.kill();
        gsap.killTweensOf(window);
        animating = false;
      };
    },
    { dependencies: [enabled], revertOnUpdate: true },
  );

  return null;
}

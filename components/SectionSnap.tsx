"use client";

import {
  isPageScrollClaimed,
  isPageSnapLocked,
  nearestIndex,
  notifySnapArrive,
  snapTargets,
} from "@/lib/pageScrollClaim";
import { useStoryMode } from "@/lib/usePrefersReducedMotion";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Observer } from "gsap/Observer";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";

gsap.registerPlugin(Observer, ScrollToPlugin, useGSAP);

const SNAP_DURATION = 0.7;
/** Arrow buttons move slower than the wheel so the transition is visible. */
const NAV_BUTTON_DURATION = 1.4;
const WHEEL_TOLERANCE = 48;

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

/** The story is one tall snap target. A step must not rewind it to the top. */
function insideStory(el: HTMLElement | undefined) {
  if (!el?.hasAttribute("data-story-bridge")) return false;
  if (!el.hasAttribute("data-flight-active")) return false;
  const top = scrollTopFor(el);
  const bottom = top + el.offsetHeight - window.innerHeight;
  return window.scrollY > top + 24 && window.scrollY <= bottom + 4;
}

export function SectionSnap() {
  const enabled = useStoryMode();

  useGSAP(
    () => {
      if (!enabled) return;

      const html = document.documentElement;
      const previousBehavior = html.style.scrollBehavior;
      html.style.scrollBehavior = "auto";
      html.classList.add("section-snap-active");

      let index = nearestIndex(snapTargets());
      let animating = false;

      const goTo = (nextIndex: number, duration = SNAP_DURATION) => {
        const sections = snapTargets();
        if (sections.length === 0 || animating) return;

        const clamped = Math.max(0, Math.min(sections.length - 1, nextIndex));
        const target = sections[clamped];
        if (!target) return;

        const targetY = scrollTopFor(target);
        const alreadyThere =
          clamped === index && Math.abs(window.scrollY - targetY) < 6;

        const toId = target.dataset.snapId ?? target.id;

        index = clamped;

        if (alreadyThere || duration <= 0.01) {
          animating = false;
          window.scrollTo(0, targetY);
          if (toId) notifySnapArrive(toId);
          return;
        }

        animating = true;

        gsap.to(window, {
          scrollTo: { y: targetY, autoKill: false },
          duration,
          ease: "sine.inOut",
          overwrite: true,
          onComplete: () => {
            animating = false;
            index = clamped;
            if (toId) notifySnapArrive(toId);
          },
        });
      };

      const step = (direction: 1 | -1, duration = SNAP_DURATION) => {
        if (animating || isPageScrollClaimed() || isPageSnapLocked()) return;

        const sections = snapTargets();
        if (sections.length === 0) return;

        // Prefer the tracked index; only reconcile if we drifted far.
        const nearest = nearestIndex(sections);
        if (Math.abs(nearest - index) > 1) {
          index = nearest;
        }

        const el = sections[index];

        // Already inside the pinned story: the wheel should scrub, not snap home.
        if (insideStory(el)) return;

        // Interactive sections own the wheel after arrive claims scroll.
        if (el?.dataset.snapInteractive === "true") {
          const id = el.dataset.snapId ?? el.id;
          if (id) notifySnapArrive(id);
          // Claim is synchronous in arrive handlers — stand down if taken.
          if (isPageScrollClaimed()) return;
        }

        goTo(index + direction, duration);
      };

      const observer = Observer.create({
        target: window,
        // Wheel only: touch screens scroll natively. (Observer reports touch
        // drags with the opposite sign, which snapped touch users backwards.)
        type: "wheel",
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

        const sections = snapTargets();
        if (insideStory(sections[index] ?? sections[0])) return;

        // Hold native scroll on desktop — sections step via Observer.
        event.preventDefault();
      };

      const onNavStep = (event: Event) => {
        const detail = (event as CustomEvent<{ direction: 1 | -1 }>).detail;
        if (!detail) return;
        // Interactive owners handle this when they have claimed the page scroll.
        if (isPageScrollClaimed()) return;
        step(detail.direction, NAV_BUTTON_DURATION);
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
        const target = sections[targetIndex];
        // Deep links inside the scrollytelling bridge (e.g. #como-funciona)
        // need the story playhead, not the bridge top. Gliding to the bridge
        // top here would override the story's seek and land back on the hero.
        if (
          target?.hasAttribute("data-story-bridge") &&
          target.hasAttribute("data-flight-active")
        ) {
          window.dispatchEvent(
            new CustomEvent("tp-story-goto", { detail: { id } }),
          );
          return;
        }
        // Nav links jump straight there — no glide past the sections between.
        goTo(targetIndex, 0);
      };

      window.addEventListener("wheel", onWheelCapture, {
        passive: false,
        capture: true,
      });
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("tp-nav-step", onNavStep);
      document.addEventListener("click", onNavClick);

      return () => {
        html.style.scrollBehavior = previousBehavior;
        html.classList.remove("section-snap-active");
        window.removeEventListener("wheel", onWheelCapture, true);
        window.removeEventListener("scroll", onScroll);
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

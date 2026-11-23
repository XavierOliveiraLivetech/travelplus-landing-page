type ScrollOwner = "features" | "journey" | "scrollytelling";

let owner: ScrollOwner | null = null;
let snapLockUntil = 0;

/** Interactive / scrubbed regions claim wheel so page snap stands down. */
export function claimPageScroll(next: ScrollOwner) {
  owner = next;
}

export function releasePageScroll(current: ScrollOwner) {
  if (owner === current) owner = null;
}

export function isPageScrollClaimed() {
  return owner !== null;
}

/**
 * Blocks page-level section snap briefly so the same wheel gesture that
 * exits an interactive section cannot also trigger a second snap step.
 */
export function lockPageSnapBriefly(ms = 500) {
  snapLockUntil = performance.now() + ms;
}

export function isPageSnapLocked() {
  return performance.now() < snapLockUntil;
}

export function notifySnapArrive(id: string) {
  window.dispatchEvent(
    new CustomEvent("tp-section-arrive", { detail: { id } }),
  );
}

/**
 * Same intent as a mouse-wheel step — used by on-screen arrow controls
 * for touch / non-mouse navigation.
 */
export function requestNavStep(direction: 1 | -1) {
  window.dispatchEvent(
    new CustomEvent("tp-nav-step", { detail: { direction } }),
  );
}

/* ——— Section snap targets (shared by SectionSnap and SectionNavButtons) ——— */

export function snapTargets(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>("[data-snap-section]"),
  );
}

/** Snap target whose middle is closest to just above mid-viewport. */
export function nearestIndex(sections: HTMLElement[]) {
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

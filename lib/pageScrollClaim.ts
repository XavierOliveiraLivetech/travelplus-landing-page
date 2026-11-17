type ScrollOwner = "features" | "journey";

let owner: ScrollOwner | null = null;
let snapLockUntil = 0;

/** Interactive sections (dial / journey) claim wheel so page snap stands down. */
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

/** Ask the page snapper to move one section (after an interactive section finishes). */
export function requestPageSnap(direction: 1 | -1, fromId?: string) {
  lockPageSnapBriefly();
  window.dispatchEvent(
    new CustomEvent("tp-section-snap", {
      detail: { direction, fromId },
    }),
  );
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

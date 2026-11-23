"use client";

import { REDUCED_MOTION_QUERY } from "@/lib/motionQueries";

/**
 * Page slides are driven by React's <ViewTransition> (see app/page.tsx and
 * app/aderir/page.tsx). Link clicks run inside a transition, so they animate.
 *
 * Browser back/forward does not: React flushes updates made *during* a native
 * `popstate` event synchronously (for scroll restoration), which skips view
 * transitions. This component catches `popstate` before Next's router
 * listener and replays it on the next task, outside the native event, so the
 * navigation becomes a regular transition and the same slide animations run.
 * Only route changes are replayed; hash changes inside a page are untouched.
 */

let currentPath: string | null = null;
let replaying = false;

function onPopState(event: PopStateEvent) {
  if (replaying) return;

  const nextPath = window.location.pathname;
  const prevPath = currentPath;
  currentPath = nextPath;

  if (!prevPath || prevPath === nextPath) return;
  if (window.matchMedia(REDUCED_MOTION_QUERY).matches) return;
  if (typeof document.startViewTransition !== "function") return;

  event.stopImmediatePropagation();
  const state = event.state;

  window.setTimeout(() => {
    replaying = true;
    try {
      window.dispatchEvent(new PopStateEvent("popstate", { state }));
    } finally {
      replaying = false;
    }
  }, 0);
}

function trackPushes() {
  // Keep currentPath in sync for client-side (Link / router) navigations.
  for (const method of ["pushState", "replaceState"] as const) {
    const original = history[method];
    history[method] = function (this: History, ...args: Parameters<History["pushState"]>) {
      const result = original.apply(this, args);
      currentPath = window.location.pathname;
      return result;
    };
  }
}

if (typeof window !== "undefined") {
  currentPath = window.location.pathname;
  // Registered at module load, i.e. before Next's router attaches its listener.
  window.addEventListener("popstate", onPopState, { capture: true });
  trackPushes();
}

export function HistorySlideTransition() {
  return null;
}

"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect } from "react";
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
 *
 * Scroll restoration is manual: the browser's own restoration runs before the
 * replayed popstate swaps the page, so it would restore the landing's position
 * on the (much shorter) /aderir page and get clamped. Instead the position of
 * every history entry is remembered here and applied, without smooth
 * scrolling, in the same commit that renders the page it belongs to.
 */

const POSITIONS_KEY = "tp-scroll-positions";

let currentPath: string | null = null;
let replaying = false;
/** Scroll target for the page a popstate is switching to (null = none). */
let pendingRestore: number | null = null;
/** Last known scroll position per history entry URL. */
let positions: Record<string, number> = {};

function entryKey() {
  return window.location.pathname + window.location.search + window.location.hash;
}

function scrollInstantly(top: number) {
  window.scrollTo({ top, left: 0, behavior: "instant" });
}

/** Saved position for the current entry, else its #hash target, else null. */
function targetForCurrentEntry(): number | null {
  const saved = positions[entryKey()];
  if (typeof saved === "number") return saved;
  return null;
}

function scrollToHashInstantly() {
  const id = decodeURIComponent(window.location.hash.slice(1));
  const el = id ? document.getElementById(id) : null;
  if (!el) return false;
  const html = document.documentElement;
  const previous = html.style.scrollBehavior;
  html.style.scrollBehavior = "auto";
  el.scrollIntoView();
  html.style.scrollBehavior = previous;
  return true;
}

function savePosition() {
  // While a popstate is swapping pages the URL already points at the next
  // entry but the old page is still on screen — don't record that.
  if (pendingRestore !== null) return;
  positions[entryKey()] = window.scrollY;
}

/** Record the entry being left before a link (page or #hash) changes the URL. */
function onLinkClick(event: MouseEvent) {
  if ((event.target as Element | null)?.closest?.("a[href]")) savePosition();
}

function persistPositions() {
  try {
    sessionStorage.setItem(POSITIONS_KEY, JSON.stringify(positions));
  } catch {
    // Storage blocked — positions only survive within this page load.
  }
}

function onPopState(event: PopStateEvent) {
  if (replaying) return;

  const nextPath = window.location.pathname;
  const prevPath = currentPath;
  currentPath = nextPath;

  if (!prevPath || prevPath === nextPath) {
    // Same page (e.g. #hash entries on the landing): the DOM is already
    // there, so restore right away.
    const target = targetForCurrentEntry();
    if (target !== null) scrollInstantly(target);
    else if (!scrollToHashInstantly()) scrollInstantly(0);
    return;
  }

  // Another page: restore once React has rendered it (see the layout effect).
  pendingRestore = targetForCurrentEntry() ?? -1;

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
  try {
    positions = JSON.parse(sessionStorage.getItem(POSITIONS_KEY) ?? "{}") ?? {};
  } catch {
    positions = {};
  }
  history.scrollRestoration = "manual";
  // Registered at module load, i.e. before Next's router attaches its listener.
  window.addEventListener("popstate", onPopState, { capture: true });
  window.addEventListener("scroll", savePosition, { passive: true });
  document.addEventListener("click", onLinkClick, true);
  window.addEventListener("pagehide", persistPositions);
  trackPushes();
}

export function HistorySlideTransition() {
  const pathname = usePathname();

  // Runs in the commit that swaps the page, before the view transition
  // captures the new page, so it slides in already at the right place.
  useLayoutEffect(() => {
    if (pendingRestore === null) return;
    const target = pendingRestore;
    pendingRestore = null;
    if (target >= 0) scrollInstantly(target);
    else if (!scrollToHashInstantly()) scrollInstantly(0);
  }, [pathname]);

  // Reload / reopened tab: manual restoration means the browser won't put the
  // visitor back where they were, so do it from the saved positions.
  useLayoutEffect(() => {
    const nav = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    if (nav?.type !== "reload" && nav?.type !== "back_forward") return;
    const target = targetForCurrentEntry();
    if (target !== null) scrollInstantly(target);
  }, []);

  return null;
}

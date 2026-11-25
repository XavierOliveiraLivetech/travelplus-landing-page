"use client";

import { useEffect } from "react";

const FOCUSABLE = "a[href], button, input, select, textarea, [tabindex]";

/**
 * Same-page "#id" links scroll to their target without writing the hash to
 * the URL (so the address stays "/" instead of "/#produto"). Scrolling still
 * follows the CSS scroll-behavior / scroll-margin, and focus moves to the
 * target like a native jump, so skip links keep working.
 */
export function InPageLinks() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const anchor = (event.target as Element | null)?.closest?.("a[href]");
      const href = anchor?.getAttribute("href");
      if (!href?.startsWith("#") || href.length < 2) return;

      const target = document.getElementById(decodeURIComponent(href.slice(1)));
      if (!target) return;

      event.preventDefault();
      target.scrollIntoView();

      if (target.matches(FOCUSABLE)) {
        target.focus({ preventScroll: true });
        return;
      }
      // Non-focusable target (section, <main>): focus it for keyboard and
      // screen-reader users without drawing a ring, as a native jump would.
      target.setAttribute("tabindex", "-1");
      target.style.outline = "none";
      target.addEventListener(
        "blur",
        () => {
          target.removeAttribute("tabindex");
          target.style.removeProperty("outline");
        },
        { once: true },
      );
      target.focus({ preventScroll: true });
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}

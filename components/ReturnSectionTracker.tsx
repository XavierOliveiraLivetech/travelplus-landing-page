"use client";

import { rememberSection } from "@/lib/returnSection";
import { useEffect } from "react";

/** Saves the current section whenever a link to /aderir is clicked. */
export function ReturnSectionTracker() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest?.("a[href]");
      const href = anchor?.getAttribute("href");
      if (href?.startsWith("/aderir")) rememberSection();
    };
    // Capture: record before Next.js navigates away.
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}

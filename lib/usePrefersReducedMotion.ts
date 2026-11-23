"use client";

import { useSyncExternalStore } from "react";
import { REDUCED_MOTION_QUERY, STORY_POINTER_QUERY } from "./motionQueries";

function subscribeTo(queries: string[]) {
  return (onChange: () => void) => {
    const lists = queries.map((query) => window.matchMedia(query));
    for (const mq of lists) mq.addEventListener("change", onChange);
    return () => {
      for (const mq of lists) mq.removeEventListener("change", onChange);
    };
  };
}

const subscribeReduced = subscribeTo([REDUCED_MOTION_QUERY]);
const subscribeStory = subscribeTo([STORY_POINTER_QUERY, REDUCED_MOTION_QUERY]);

const serverFalse = () => false;

/**
 * True when the visitor asked the OS for less motion. Follows live changes;
 * the server render (and hydration) assume full motion.
 */
export function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    serverFalse,
  );
}

/**
 * True when the desktop story (pin, wheel snap, arrow buttons) runs:
 * wide screen + mouse/trackpad, and full motion. False on the server.
 */
export function useStoryMode() {
  return useSyncExternalStore(
    subscribeStory,
    () =>
      window.matchMedia(STORY_POINTER_QUERY).matches &&
      !window.matchMedia(REDUCED_MOTION_QUERY).matches,
    serverFalse,
  );
}

"use client";

import { type RefObject, useEffect, useState } from "react";

/** Story layers count as "shown" once their fade is mostly done. */
const SHOWN_OPACITY = 0.6;

/**
 * Everything the pinned story fades in (panels, CTA/footer layers and the
 * per-item reveals the plane does in features / steps / pricing).
 */
const STORY_FADE_SELECTOR = [
  "[data-story-panel]",
  "[data-story-layer]",
  "[data-feature-item]",
  "[data-step-item]",
  "[data-pricing-item]",
].join(",");

function storyFadeLayers(el: HTMLElement, bridge: HTMLElement) {
  const layers: HTMLElement[] = [];
  let node = el.closest<HTMLElement>(STORY_FADE_SELECTOR);
  while (node && bridge.contains(node)) {
    layers.push(node);
    node = node.parentElement?.closest<HTMLElement>(STORY_FADE_SELECTOR) ?? null;
  }
  return layers;
}

/**
 * True while the element is really on screen for the visitor.
 *
 * On desktop every section lives in the pinned story stage at the same time
 * (stacked, faded in/out by GSAP), so IntersectionObserver alone reports them
 * all as visible from page load and demos run while hidden. There we wait for
 * every story layer around the element to be faded in. Everywhere else
 * (mobile/tablet, reduced motion) it falls back to plain intersection.
 *
 * Use the false → true flip to restart an animation from its first frame.
 */
export function useSectionActive(
  ref: RefObject<HTMLElement | null>,
  threshold = 0.5,
) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const bridge = el.closest<HTMLElement>("[data-story-bridge]");
    const layers = bridge ? storyFadeLayers(el, bridge) : [];

    let intersecting = false;
    let current = false;

    const sync = () => {
      const pinned = bridge?.dataset.flightActive === "true";
      // Intersection still rules out copies hidden with display:none.
      const next =
        intersecting &&
        (!pinned ||
          layers.every(
            (layer) => Number(getComputedStyle(layer).opacity) > SHOWN_OPACITY,
          ));
      if (next === current) return;
      current = next;
      setActive(next);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        intersecting = Boolean(entry?.isIntersecting);
        sync();
      },
      { threshold },
    );
    io.observe(el);

    const mo = new MutationObserver(sync);
    if (bridge) {
      mo.observe(bridge, {
        attributes: true,
        attributeFilter: ["data-flight-active"],
      });
    }
    for (const layer of layers) {
      mo.observe(layer, { attributes: true, attributeFilter: ["style", "class"] });
    }

    sync();
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [ref, threshold]);

  return active;
}

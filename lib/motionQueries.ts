/**
 * Shared media queries for the page's motion modes.
 *
 * The pinned scrollytelling story, the wheel section-snap and the arrow
 * buttons are built for a mouse wheel / trackpad on a wide screen. Tablets in
 * landscape (iPad, Android, Surface in tablet mode) are ≥ 1024px wide too, but
 * scroll by touch: there the story fights native momentum scrolling. So the
 * story needs a wide viewport AND a primary pointer that hovers precisely.
 * Everything else gets the natural-scroll layout with light scroll reveals.
 *
 * Keep in sync with the CSS media queries that use the same conditions
 * (globals.css, SectionNavButtons.module.css).
 */
const STORY_MIN_WIDTH_PX = 1024;

/** Wide screen driven by a mouse / trackpad. */
export const STORY_POINTER_QUERY = `(min-width: ${STORY_MIN_WIDTH_PX}px) and (hover: hover) and (pointer: fine)`;

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

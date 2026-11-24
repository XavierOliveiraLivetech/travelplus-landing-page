"use client";

import { type PointerEvent, useRef, useState } from "react";
import { PROOF } from "@/lib/site-data";
import type { CssVars } from "@/lib/cssVars";
import styles from "./HeroHighlights.module.css";

/**
 * Hero highlights: a carousel that shows one item at a time and only moves
 * when the visitor picks a bar below it or drags / swipes the card.
 * Nothing auto-advances, so WCAG 2.2.2 (Pause, Stop, Hide) does not apply
 * and no pause button is needed. The bars are the single-pointer
 * alternative to dragging that WCAG 2.5.7 (Dragging Movements) asks for.
 *
 * Same component for everyone; with prefers-reduced-motion the swap is
 * instant instead of a slide (handled in CSS).
 */
export function HeroHighlights() {
  const [active, setActive] = useState(0);
  const [dragX, setDragX] = useState<number | null>(null);
  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    t: number;
    axis: "x" | "y" | null;
  } | null>(null);
  const count = PROOF.length;

  // Drag moves one card at a time and stops at the ends (the track can't
  // loop smoothly); the bars still jump to any item.
  const step = (delta: number) =>
    setActive((i) => Math.min(count - 1, Math.max(0, i + delta)));

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    drag.current = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      t: performance.now(),
      axis: null,
    };
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    // Decide the gesture once it moves a little: horizontal = drag the card,
    // vertical = let the page scroll (touch-action: pan-y keeps that native).
    if (!d.axis) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      d.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (d.axis === "x") {
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // Pointer already gone — the drag still works without capture
        }
      }
    }
    if (d.axis !== "x") return;
    // 1:1 with the pointer; rubber-band past the first / last card
    const atEdge = (dx > 0 && active === 0) || (dx < 0 && active === count - 1);
    setDragX(atEdge ? dx * 0.3 : dx);
  };

  const endDrag = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    if (d.axis === "x") {
      const dx = e.clientX - d.x;
      const width = e.currentTarget.offsetWidth || 1;
      const speed = Math.abs(dx) / Math.max(1, performance.now() - d.t); // px/ms
      // Far enough (a fifth of the card) or a quick flick
      if (Math.abs(dx) > width * 0.2 || (Math.abs(dx) > 30 && speed > 0.5)) {
        step(dx < 0 ? 1 : -1);
      }
    }
    setDragX(null);
  };

  return (
    <div
      className={styles.root}
      role="group"
      aria-roledescription="carrossel"
      aria-label="Destaques"
    >
      {/* Announces the new item after a click / drag (user-initiated, so polite is fine) */}
      <div
        className={styles.viewport}
        data-dragging={dragX !== null || undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <ul
          className={styles.list}
          aria-live="polite"
          style={
            {
              "--index": active,
              "--drag": `${dragX ?? 0}px`,
            } as CssVars
          }
        >
          {PROOF.map((item, i) => (
            <li
              key={item.value}
              className={styles.item}
              data-active={i === active || undefined}
              aria-hidden={i !== active}
              aria-roledescription="diapositivo"
              aria-label={`${i + 1} de ${count}`}
            >
              <span className={styles.text}>
                <span className={styles.value}>{item.value}</span>
                <span className={styles.label}>{item.label}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.dots}>
        {PROOF.map((item, i) => (
          <button
            key={item.value}
            type="button"
            className={styles.dot}
            aria-label={`Mostrar destaque ${i + 1} de ${count}: ${item.value}`}
            aria-current={i === active ? "true" : undefined}
            onClick={() => setActive(i)}
          />
        ))}
      </div>
    </div>
  );
}

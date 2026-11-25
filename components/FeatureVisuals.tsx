"use client";

import { assetPath } from "@/lib/assetPath";
import type { CssVars } from "@/lib/cssVars";
import { type ReactNode, useRef } from "react";
import {
  LuEllipsisVertical,
  LuCalendarDays,
  LuCheck,
  LuClock,
  LuCreditCard,
  LuMapPin,
  LuRefreshCw,
  LuSearch,
  LuSettings,
  LuUsers,
} from "react-icons/lu";
import styles from "./FeatureVisuals.module.css";
import { useStepTurn } from "./StepVisuals";

/*
 * Illustrations for the feature bento (3 + 2 layout adapted from the 21st.dev
 * "Feature Highlights Grid"):
 * - gestão: a small network, the modules wired to the TravelPlus hub;
 * - widget, operadores, cliente: mini product UIs floating on the card (the
 *   search widget, the operator comparison, the client area);
 * - orçamentos: the quote timeline on its own, no panel.
 * All use the site's mock-UI tokens (--ui-*), like PlatformFlow and
 * StepVisuals.
 *
 * Motion follows the "Como funciona" cards exactly (useStepTurn inside the
 * grid's StepSequence): each card plays a one-shot demo of DEMO_MS when it
 * gets its turn — after the card before it has finished, and on stacked
 * layouts only once the card is almost fully in view. CSS animations hang off
 * [data-running]; without it (waiting, scrolled away) the card holds the
 * demo's first frame, and dropping it lets the demo replay from 0% on
 * return. Under reduced motion the finished frame shows, still.
 * Purely decorative: the copy carries the meaning.
 */

const LOGO_SRC = assetPath("/brand/logo-mark.png");

export type FeatureId =
  | "widget"
  | "operadores"
  | "orcamentos"
  | "gestao"
  | "cliente";

/* ——— 01 · Widget: the search widget the agency embeds in its site ——— */

function WidgetVisual() {
  return (
    <div className={styles.frameArea}>
      <div className={`${styles.frame} ${styles.flat} ${styles.widget}`}>
        <span className={styles.field}>
          <LuMapPin />
          <span className={styles.fieldText}>
            <span className={styles.typed}>Punta Cana</span>
          </span>
        </span>
        <span className={styles.field}>
          <LuCalendarDays />
          <span className={styles.fieldText}>12–19 jun</span>
        </span>
        <span className={styles.searchBtn}>
          <LuSearch />
          Pesquisar
          <span className={`${styles.cursor} ${styles.cursorBtn}`} />
        </span>
      </div>
    </div>
  );
}

/* ——— 02 · Multi-operator: one search, every operator, best price ———
 * Real operator logos (the same files PlatformFlow uses), all wide marks. */

const OFFERS = [
  { id: "soltour", name: "Soltour", price: "1 389 €" },
  { id: "travelplan", name: "Travelplan", price: "1 249 €", best: true },
  { id: "newblue", name: "Newblue", price: "1 412 €" },
] as const;

function OperatorsVisual() {
  return (
    <div className={styles.frameArea}>
      <div className={`${styles.frame} ${styles.flat} ${styles.panel}`}>
        {/* Shown in the empty panel while the card waits for its turn */}
        <span className={styles.loading}>A carregar resultados pesquisa...</span>
        <ul className={styles.offers}>
          {OFFERS.map((offer, i) => (
            <li
              key={offer.id}
              className={styles.offer}
              data-best={"best" in offer ? "true" : undefined}
              style={{ "--row": i } as CssVars}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={assetPath(`/operators/${offer.id}.png`)}
                alt=""
                className={styles.opLogo}
              />
              {"best" in offer && (
                <span className={styles.bestChip}>Melhor preço</span>
              )}
              <span className={styles.price}>{offer.price}</span>
              {/* Pointer that glides in and picks the best offer (same
                  cursor as PlatformFlow) */}
              {"best" in offer && <span className={styles.cursor} />}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ——— 03 · Quote → accepted → booking confirmed: a bare timeline ——— */

const STAGES = ["Orçamento", "Aprovação", "Reserva"] as const;

function QuotesVisual() {
  return (
    <div className={styles.frameArea}>
      <div className={styles.stepper}>
        <span className={styles.track}>
          <span className={styles.trackFill} />
        </span>
        {STAGES.map((stage, i) => (
          <span
            key={stage}
            className={styles.step}
            style={{ "--stage": i } as CssVars}
          >
            <span className={styles.stageDot}>
              <LuCheck />
            </span>
            <span className={styles.stageLabel}>{stage}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ——— 04 · Centralised management: back-office modules, one hub ——— */

/* A small network: the logo is the hub and the back-office modules are nodes
 * wired to it. Coordinates live in a 300 × 200 space shared by the SVG lines
 * and the HTML nodes (positioned in %), so both stay aligned at any size. */
const NET_W = 300;
const NET_H = 200;
const HUB = { x: 150, y: 100 };

/** i: order the modules light up in; j, s: fixed offsets (0–1) so each spoke
 * starts (j) and draws (s) at its own pace. */
const MODULES = [
  { key: "users", x: 32, y: 100, i: 0, j: 0.6, s: 0.2, icon: <LuUsers /> },
  { key: "card", x: 70, y: 28, i: 1, j: 0, s: 0.8, icon: <LuCreditCard /> },
  { key: "calendar", x: 230, y: 30, i: 2, j: 0.9, s: 0.4, icon: <LuCalendarDays /> },
  { key: "sync", x: 268, y: 100, i: 3, j: 0.3, s: 1, icon: <LuRefreshCw /> },
  { key: "settings", x: 212, y: 176, i: 4, j: 0.5, s: 0, icon: <LuSettings /> },
] as const;

type Point = { x: number; y: number };

const pct = (p: Point) => ({
  left: `${(p.x / NET_W) * 100}%`,
  top: `${(p.y / NET_H) * 100}%`,
});

function BackofficeVisual() {
  return (
    <div className={styles.netArea}>
      <div className={styles.net}>
        <svg
          className={styles.netLines}
          viewBox={`0 0 ${NET_W} ${NET_H}`}
          preserveAspectRatio="none"
        >
          {MODULES.map((m) => (
            <g key={m.key} style={{ "--j": m.j, "--s": m.s } as CssVars}>
              <line
                className={styles.spoke}
                x1={HUB.x}
                y1={HUB.y}
                x2={m.x}
                y2={m.y}
                pathLength={1}
              />
              <line
                className={styles.spokeLit}
                x1={HUB.x}
                y1={HUB.y}
                x2={m.x}
                y2={m.y}
                pathLength={1}
              />
            </g>
          ))}
        </svg>

        {MODULES.map((m) => (
          <span
            key={m.key}
            className={styles.node}
            style={
              {
                ...pct(m),
                "--i": m.i,
                "--j": m.j,
                "--s": m.s,
                // Offset to the hub in cqw of .net: 1 cqw = 3 units of the
                // 300-wide space, and the 3:2 stage makes y scale the same
                "--dx": (HUB.x - m.x) / 3,
                "--dy": (HUB.y - m.y) / 3,
              } as CssVars
            }
          >
            {m.icon}
          </span>
        ))}

        <span className={styles.hub} style={pct(HUB)}>
          {/* The hub's circle, drawn as a line while the modules appear */}
          <svg className={styles.hubRing} viewBox="0 0 100 100">
            <circle cx={50} cy={50} r={48.5} pathLength={1} />
          </svg>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_SRC} alt="" className={styles.hubLogo} />
        </span>
      </div>
    </div>
  );
}

/* ——— 05 · Client area under the agency's brand ——— */

function ClientVisual() {
  return (
    <div className={styles.frameArea}>
      <div className={`${styles.frame} ${styles.flat} ${styles.panel} ${styles.client}`}>
        <div className={styles.clientHead}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_SRC} alt="" className={styles.clientLogo} />
          <span className={styles.menu}>
            <LuEllipsisVertical />
          </span>
        </div>
        <div className={styles.trip}>
          <span className={styles.tripText}>
            <span className={styles.tripTitle}>Punta Cana</span>
            <span className={styles.tripMeta}>12–19 jun</span>
          </span>
          {/* Waiting for its turn: "Aguarda resposta"; the demo swaps it
              for "Confirmada" (both share one grid cell) */}
          <span className={styles.status}>
            <span className={`${styles.chipPending} ${styles.pending}`}>
              <LuClock />
              Aguarda resposta
            </span>
            <span className={`${styles.chipSuccess} ${styles.toast}`}>
              <LuCheck />
              Confirmada
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

const VISUALS: Record<FeatureId, () => ReactNode> = {
  widget: WidgetVisual,
  operadores: OperatorsVisual,
  orcamentos: QuotesVisual,
  gestao: BackofficeVisual,
  cliente: ClientVisual,
};

/** Length of each card's one-shot demo — must match its CSS animations. */
const DEMO_MS: Record<FeatureId, number> = {
  widget: 3000,
  operadores: 3400,
  cliente: 1800,
  orcamentos: 2800,
  gestao: 3600,
};

export function FeatureVisual({
  id,
  index,
}: {
  id: FeatureId;
  /** Position in the grid: cards take their turn in this order. */
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const running = useStepTurn(ref, index, DEMO_MS[id]);
  const Visual = VISUALS[id];
  return (
    <div
      ref={ref}
      className={styles.visual}
      data-visual={id}
      data-running={running ? "" : undefined}
      aria-hidden="true"
    >
      <Visual />
    </div>
  );
}

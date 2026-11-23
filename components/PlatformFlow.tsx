"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import {
  LuCalendarDays,
  LuCheck,
  LuChevronDown,
  LuCreditCard,
  LuGift,
  LuLayers,
  LuSearch,
  LuShieldCheck,
  LuUser,
  LuUsers,
} from "react-icons/lu";
import { usePausableTimeout } from "@/lib/usePausableTimeout";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";
import { useSectionActive } from "@/lib/useSectionActive";
import { MotionToggle } from "./MotionToggle";
import styles from "./PlatformFlow.module.css";
import { assetPath } from "@/lib/assetPath";

const LOGO_SRC = assetPath("/brand/logo-mark.png");

/**
 * Decorative product demo for the "problem" section: one platform, one flow —
 * search across operators → pick a result → insurance/extras/passengers → payment.
 * Purely illustrative; hidden from assistive tech (the section copy carries the meaning).
 */

const SCENES = [
  { key: "search", label: "Pesquisa", icon: LuSearch, ms: 3400 },
  { key: "results", label: "Operadores", icon: LuLayers, ms: 6200 },
  { key: "extras", label: "Extras", icon: LuShieldCheck, ms: 7800 },
  { key: "passengers", label: "Passageiros", icon: LuUsers, ms: 5000 },
  { key: "payment", label: "Pagamento", icon: LuCreditCard, ms: 5600 },
] as const;

/** Logos live in /public/operators — drop the files there with these names. */
const OPERATORS = [
  { id: "newblue", name: "Newblue", logo: assetPath("/operators/newblue.png") },
  { id: "solferias", name: "Solférias", logo: assetPath("/operators/solferias.png") },
  { id: "soltropico", name: "Soltrópico", logo: assetPath("/operators/soltropico.png") },
  { id: "viajartours", name: "Viajar Tours", logo: assetPath("/operators/viajartours.png") },
  { id: "soltour", name: "Soltour", logo: assetPath("/operators/soltour.png") },
  { id: "travelplan", name: "Travelplan", logo: assetPath("/operators/travelplan.png") },
  { id: "tui", name: "TUI", logo: assetPath("/operators/tui.png") },
] as const;

type OperatorId = (typeof OPERATORS)[number]["id"];

const OP_BY_ID = Object.fromEntries(OPERATORS.map((op) => [op.id, op])) as Record<
  OperatorId,
  (typeof OPERATORS)[number]
>;

/** One room per operator, cheapest first (like the real results page). */
const RESULTS: {
  title: string;
  op: OperatorId;
  total: string;
}[] = [
  { title: "Deluxe", op: "newblue", total: "2042€" },
  { title: "Standard", op: "soltour", total: "2168€" },
  { title: "Superior", op: "solferias", total: "2258€" },
  { title: "Deluxe", op: "soltropico", total: "2380€" },
  { title: "Duplo", op: "viajartours", total: "2524€" },
  { title: "Vista Mar", op: "tui", total: "2596€" },
  { title: "Suite", op: "travelplan", total: "2690€" },
];

const PICKED = OP_BY_ID[RESULTS[0].op].name;

/** Prices already cover both passengers, so no "/pessoa" maths on screen. */
const INSURANCES = [
  { name: "Básico", price: "+70€" },
  { name: "Médio", price: "+100€" },
  { name: "Total", price: "+200€" },
] as const;

/** Index of the insurance the cursor picks (+100€ for both passengers). */
const INSURANCE_PICK = 1;
const BASE_TOTAL = "2042€";

/**
 * Extras: one comes with the package, the others the cursor ticks one by one.
 * `check` = when the box turns on. A single cursor ticks them in turn
 * (see EXTRAS_CURSOR and `.cursorChain` — timings must stay in sync).
 */
const EXTRAS: {
  name: string;
  price?: string;
  check?: number;
}[] = [
  { name: "Transfer privado", price: "+60€", check: 4050 },
  { name: "Mala 23 kg", price: "+50€", check: 5400 },
];

/** The one cursor that ticks both optional extras without leaving. */
const EXTRAS_CURSOR = { at: 3150, from: "9rem, -6rem" };

/** Running total in the header: base → +insurance → +each extra. */
const TOTAL_STEPS = [
  { value: BASE_TOTAL, at: 0 },
  { value: "2142€", at: 2350 },
  { value: "2202€", at: 4150 },
  { value: "2252€", at: 5500 },
] as const;

const FINAL_TOTAL = TOTAL_STEPS[TOTAL_STEPS.length - 1].value;

/** Both travellers get filled in, one after the other (`at` = first keystroke). */
const PASSENGERS = [
  { first: "João", last: "Silva", birth: "01/01/1998", at: 400 },
  { first: "Ana", last: "Gomes", birth: "17/03/1999", at: 2000 },
] as const;

const PASSENGER_FIELDS = [
  { key: "first", label: "Nome" },
  { key: "last", label: "Apelido" },
  { key: "birth", label: "Nascimento" },
] as const;

/** Gap between one field finishing and the next one starting. */
const FIELD_GAP = 140;

const PAY_METHODS = [
  { name: "MB WAY" },
  { name: "Multibanco" },
  { name: "Cartão" },
] as const;

type Vars = CSSProperties & Record<`--${string}`, string | number>;

/**
 * Per-keystroke delays (ms) for a string, with a little human rhythm:
 * a varied base cadence, a short hesitation after spaces / separators.
 * Deterministic so server and client render the same markup.
 */
function keystrokes(text: string) {
  const chars = [...text];
  const delays: number[] = [];
  let t = 0;
  chars.forEach((ch, i) => {
    delays.push(t);
    const base = 30 + ((i * 37 + ch.charCodeAt(0) * 13) % 24); // 30–53ms
    const pause = /[\s/·]/.test(ch) ? 55 : 0;
    t += base + pause;
  });
  return { chars, delays, total: t };
}

/** How long a value takes to type, so fields can be chained back to back. */
function typingMs(text: string) {
  return keystrokes(text).total;
}

/** Timing vars for the field that wraps a <Typed>, so it looks focused while typing. */
function focusVars(text: string, at: number): Vars {
  // Ends right as the next field starts (FIELD_GAP later), so only one looks focused.
  return {
    "--focus-at": `${at - 120}ms`,
    "--focus-dur": `${typingMs(text) + 120 + FIELD_GAP}ms`,
  };
}

/** Operator logo; falls back to the operator name if the file is missing. */
function OperatorLogo({ id, className }: { id: OperatorId; className?: string }) {
  const op = OP_BY_ID[id];
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // The 404 can happen before hydration, when onError isn't attached yet.
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, []);

  return (
    <span
      className={[styles.opLogo, className].filter(Boolean).join(" ")}
      data-op={id}
    >
      {failed ? (
        <span className={styles.opLogoText}>{op.name}</span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img ref={imgRef} src={op.logo} alt="" onError={() => setFailed(true)} />
      )}
    </span>
  );
}

/** Pointer that glides onto its parent element and "clicks" it. */
function Cursor({
  at,
  from = "2.5rem, 2rem",
  chain = false,
}: {
  at: number;
  from?: string;
  /** Clicks its parent, then moves down by `--hop` and clicks again. */
  chain?: boolean;
}) {
  return (
    <span
      className={[styles.cursor, chain ? styles.cursorChain : ""].filter(Boolean).join(" ")}
      style={{ "--at": `${at}ms`, "--from": from } as Vars}
    />
  );
}

/**
 * Text typed one keystroke at a time: each character pops in on its own beat
 * and a caret rides on the last typed character (blinking at the start and
 * for a moment after the last one, then gone).
 */
function Typed({ text, at }: { text: string; at: number }) {
  const { chars, delays, total } = keystrokes(text);
  return (
    <span className={styles.typed} style={{ "--at": `${at}ms` } as Vars}>
      {chars.map((ch, i) => (
        <span
          key={i}
          className={[styles.char, i === chars.length - 1 ? styles.charLast : ""]
            .filter(Boolean)
            .join(" ")}
          style={
            {
              "--d": `${delays[i]}ms`,
              "--n": `${(delays[i + 1] ?? total) - delays[i]}ms`,
            } as Vars
          }
        >
          {ch}
        </span>
      ))}
    </span>
  );
}

function Field({
  label,
  children,
  icon,
  style,
}: {
  label: string;
  children: ReactNode;
  icon?: ReactNode;
  style?: Vars;
}) {
  return (
    <span className={styles.field} style={style}>
      <small>{label}</small>
      <span className={styles.fieldValue}>
        {children}
        {icon ?? <LuChevronDown aria-hidden className={styles.fieldIcon} />}
      </span>
    </span>
  );
}

/** Search bar values: already filled in (only the passenger form is typed). */
const SEARCH_FIELDS: { label: string; text: string; icon?: ReactNode }[] = [
  { label: "Destino", text: "Ilha do Sal" },
  { label: "Partida", text: "Lisboa" },
  {
    label: "Data de ida",
    text: "21/01 · 7 noites",
    icon: <LuCalendarDays aria-hidden className={styles.fieldIcon} />,
  },
  { label: "Passageiros", text: "2 adultos" },
];

/** The cursor heads for "Pesquisar" once the operator logos have popped in. */
const SEARCH_CURSOR = 1200;
const SEARCH_PRESS = SEARCH_CURSOR + 650;

function SearchScene() {
  return (
    <>
      <p className={styles.sceneLabel}>Pesquisa de pacotes</p>
      <div className={styles.searchBar}>
        {SEARCH_FIELDS.map((f) => (
          <Field key={f.label} label={f.label} icon={f.icon}>
            {f.text}
          </Field>
        ))}
      </div>
      <div className={styles.connected}>
        <span className={styles.connectedHead}>
          <small>Operadores</small>
          <span className={styles.chipSuccess}>
            <LuCheck aria-hidden />
            Todos
          </span>
        </span>
        <span className={styles.opChips}>
          {OPERATORS.map((op, i) => (
            <span
              key={op.id}
              className={styles.opChip}
              style={{ "--at": `${250 + i * 110}ms` } as Vars}
            >
              <OperatorLogo id={op.id} />
            </span>
          ))}
        </span>
      </div>
      <div className={styles.searchFoot}>
        <span
          className={styles.searching}
          style={{ "--at": `${SEARCH_PRESS + 150}ms` } as Vars}
        >
          <i />A pesquisar em {OPERATORS.length} operadores
        </span>
        <span
          className={`${styles.btnPrimary} ${styles.pressable}`}
          style={{ "--press": `${SEARCH_PRESS}ms` } as Vars}
        >
          Pesquisar
          <Cursor at={SEARCH_CURSOR} from="3.5rem, 3rem" />
        </span>
      </div>
    </>
  );
}

function ResultsScene() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // How far the list must scroll so the last room comes into view.
  useEffect(() => {
    const viewport = viewportRef.current;
    const list = listRef.current;
    if (!viewport || !list) return;
    const sync = () => {
      const overflow = Math.max(0, list.scrollHeight - viewport.clientHeight);
      viewport.style.setProperty("--scroll", `${-overflow}px`);
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(viewport);
    ro.observe(list);
    return () => ro.disconnect();
  }, []);

  return (
    <>
      <div className={styles.resultsHead}>
        <p className={styles.sceneLabel}>Ilha do Sal · 2 adultos</p>
        <span className={styles.resultsCount}>{RESULTS.length} resultados</span>
      </div>
      <div ref={viewportRef} className={styles.resultsViewport}>
        <div ref={listRef} className={styles.results}>
          {RESULTS.map((r, i) => (
            <div
              key={r.op}
              className={`${styles.resultRow} ${i === 0 ? styles.resultPick : ""}`}
              style={{ "--at": `${900 + i * 110}ms` } as Vars}
            >
              <span className={styles.resultText}>
                <b>{r.title}</b>
              </span>
              <OperatorLogo id={r.op} className={styles.resultOp} />
              <span className={styles.resultPrice}>
                <b>{r.total}</b>
              </span>
              <span
                className={`${styles.btnSoft} ${i === 0 ? styles.pressable : ""}`}
                style={i === 0 ? ({ "--press": "5050ms" } as Vars) : undefined}
              >
                Reservar
                {i === 0 ? <Cursor at={4150} from="-4rem, 4.5rem" /> : null}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function ExtrasScene() {
  const listRef = useRef<HTMLUListElement>(null);

  // Distance between the two checkboxes, so one cursor can hop from the first to the second.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const sync = () => {
      // offsetTop ignores the scene's slide-in transform, unlike getBoundingClientRect.
      const rows = [...list.querySelectorAll<HTMLElement>(`.${styles.extraBox}`)].map(
        (box) => box.closest("li")?.offsetTop ?? 0,
      );
      if (rows.length < 2) return;
      list.style.setProperty("--hop", `${rows[1] - rows[0]}px`);
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(list);
    return () => ro.disconnect();
  }, []);

  let optionalIndex = 0;

  return (
    <>
      <div className={styles.bookingHead}>
        <p className={styles.sceneLabel}>
          {RESULTS[0].title} · {PICKED}
        </p>
        <span className={styles.totalSwap}>
          {TOTAL_STEPS.map((step, i) => (
            <span
              key={step.value}
              className={[
                styles.totalStep,
                i === 0 ? styles.totalFirst : "",
                i === TOTAL_STEPS.length - 1 ? styles.totalLast : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={
                {
                  "--in": `${step.at}ms`,
                  "--out": `${TOTAL_STEPS[i + 1]?.at ?? 0}ms`,
                } as Vars
              }
            >
              {step.value}
            </span>
          ))}
        </span>
      </div>

      <div className={styles.block}>
        <span className={styles.blockHead}>
          <span className={styles.panelIcon}>
            <LuShieldCheck aria-hidden />
          </span>
          <span className={styles.panelText}>
            <b>Seguro</b>
          </span>
        </span>
        <div className={styles.insurances}>
          {INSURANCES.map((ins, i) => (
            <span
              key={ins.name}
              className={[
                styles.insurance,
                i === INSURANCE_PICK ? styles.insurancePick : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={{ "--at": `${300 + i * 120}ms` } as Vars}
            >
              <b>{ins.name}</b>
              <span className={styles.insurancePrice}>{ins.price}</span>
              <span
                className={[
                  styles.insuranceBtn,
                  i === INSURANCE_PICK ? styles.pressable : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={
                  i === INSURANCE_PICK ? ({ "--press": "2150ms" } as Vars) : undefined
                }
              >
                <span className={styles.btnIdle}>Escolher</span>
                {i === INSURANCE_PICK ? (
                  <span className={styles.btnDone}>
                    <LuCheck aria-hidden />
                    Escolhido
                  </span>
                ) : null}
                {i === INSURANCE_PICK ? (
                  <Cursor at={1250} from="3rem, 3.5rem" />
                ) : null}
              </span>
            </span>
          ))}
        </div>
      </div>

      <div className={styles.block}>
        <span className={styles.blockHead}>
          <span className={styles.panelIcon}>
            <LuGift aria-hidden />
          </span>
          <span className={styles.panelText}>
            <b>Extras</b>
          </span>
        </span>
        <ul ref={listRef} className={styles.extrasList}>
          {EXTRAS.map((ex, i) => {
            const firstOptional = Boolean(ex.price) && optionalIndex++ === 0;
            return (
            <li
              key={ex.name}
              className={[styles.extraRow, firstOptional ? styles.extraRowLead : ""]
                .filter(Boolean)
                .join(" ")}
              style={
                {
                  "--at": `${650 + i * 120}ms`,
                  "--check": `${ex.check ?? 0}ms`,
                } as Vars
              }
            >
              {ex.price ? (
                <span className={styles.extraBox}>
                  <LuCheck aria-hidden />
                  {firstOptional ? (
                    <Cursor
                      at={EXTRAS_CURSOR.at}
                      from={EXTRAS_CURSOR.from}
                      chain
                    />
                  ) : null}
                </span>
              ) : (
                <span className={styles.extraCheck}>
                  <LuCheck aria-hidden />
                </span>
              )}
              <span className={styles.extraText}>
                <b>{ex.name}</b>
              </span>
              {ex.price ? (
                <span className={styles.extraPrice}>{ex.price}</span>
              ) : (
                <span className={styles.pillIncluded}>Incluído</span>
              )}
            </li>
            );
          })}
        </ul>
      </div>

      <div className={styles.sceneFoot}>
        <span
          className={`${styles.btnPrimary} ${styles.pressable}`}
          style={{ "--press": "6700ms" } as Vars}
        >
          Continuar
          <Cursor at={5850} from="-4rem, -3rem" />
        </span>
      </div>
    </>
  );
}

function PassengersScene() {
  return (
    <>
      <div className={styles.bookingHead}>
        <p className={styles.sceneLabel}>Passageiros</p>
        <span className={styles.bookingTotal}>{FINAL_TOTAL}</span>
      </div>

      {PASSENGERS.map((pax, p) => {
        let at = pax.at;
        return (
        <div key={pax.first} className={styles.block}>
          <span className={styles.blockHead}>
            <span className={styles.panelIcon}>
              <LuUser aria-hidden />
            </span>
            <span className={styles.panelText}>
              <b>Passageiro {p + 1}</b>
            </span>
          </span>
          <div className={styles.passengerFields}>
            {PASSENGER_FIELDS.map((field) => {
              const text = pax[field.key];
              const fieldAt = at;
              at += typingMs(text) + FIELD_GAP;
              return (
                <span
                  key={field.label}
                  className={styles.input}
                  style={focusVars(text, fieldAt)}
                >
                  <small>{field.label}</small>
                  <Typed text={text} at={fieldAt} />
                </span>
              );
            })}
          </div>
        </div>
        );
      })}

      <div className={styles.sceneFoot}>
        <span
          className={`${styles.btnPrimary} ${styles.pressable}`}
          style={{ "--press": "4100ms" } as Vars}
        >
          Continuar
          <Cursor at={3300} from="-3rem, 2.5rem" />
        </span>
      </div>
    </>
  );
}

function PaymentScene() {
  return (
    <>
      <div className={styles.paySummary} style={{ "--at": "80ms" } as Vars}>
        <span className={styles.paySummaryHead}>
          <span className={styles.paySummaryTrip}>
            <b>{RESULTS[0].title} · Ilha do Sal</b>
          </span>
          <OperatorLogo id={RESULTS[0].op} className={styles.paySummaryOp} />
        </span>
        <span className={styles.paySummaryLine}>
          <span>Voo + hotel</span>
          <span>{BASE_TOTAL}</span>
        </span>
        <span className={styles.paySummaryLine}>
          <span>Seguro</span>
          <span>+100€</span>
        </span>
        <span className={styles.paySummaryLine}>
          <span>Extras</span>
          <span>+110€</span>
        </span>
      </div>

      <p className={styles.sceneLabel}>Pagamento</p>
      <div className={styles.methods}>
        {PAY_METHODS.map((m, i) => (
          <span
            key={m.name}
            className={`${styles.method} ${i === 0 ? styles.methodPick : ""}`}
            style={{ "--at": `${100 + i * 140}ms` } as Vars}
          >
            <span className={styles.radio}>
              {i === 0 ? <Cursor at={500} from="4rem, 3.5rem" /> : null}
            </span>
            {m.name}
          </span>
        ))}
      </div>

      <div className={styles.payFoot}>
        <span className={styles.payTotal}>
          <small>Total</small>
          <b>{FINAL_TOTAL}</b>
        </span>
        <span
          className={`${styles.btnPrimary} ${styles.pressable}`}
          style={{ "--press": "2700ms" } as Vars}
        >
          Confirmar
          <Cursor at={1800} from="-6rem, -3.5rem" />
        </span>
      </div>

      <div className={styles.success}>
        <span className={styles.successIcon}>
          <LuCheck aria-hidden />
        </span>
        <b>Reserva confirmada</b>
      </div>
    </>
  );
}

const SCENE_VIEWS = [
  SearchScene,
  ResultsScene,
  ExtrasScene,
  PassengersScene,
  PaymentScene,
];

export function PlatformFlow() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [scene, setScene] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = usePrefersReducedMotion();

  // Start from the first scene every time its section becomes the active one
  // (unless the visitor paused it: then it waits exactly where it stopped).
  const inView = useSectionActive(rootRef);
  useEffect(() => {
    if (!paused) setScene(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView]);

  usePausableTimeout(
    inView && !reduced ? SCENES[scene].ms : null,
    () => setScene((s) => (s + 1) % SCENES.length),
    { paused, key: `${scene}-${inView}` },
  );

  const active = reduced ? 1 : scene;
  // A paused demo keeps its running class so its CSS animations hold their
  // frame instead of restarting from 0% (which would blank the scene).
  const running = !reduced && (inView || paused);

  return (
    <div className={styles.visual}>
      <div
        ref={rootRef}
        className={[
          styles.card,
          running ? styles.running : "",
          paused ? styles.paused : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-hidden="true"
      >
        <div className={styles.appBar}>
          <span className={styles.dots}>
            <i />
            <i />
            <i />
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className={styles.logo}
            src={LOGO_SRC}
            alt=""
            width={152}
            height={82}
          />
          <ol className={styles.stepper}>
            {SCENES.map((s, i) => {
              const Icon = s.icon;
              return (
                <li
                  key={s.key}
                  className={[
                    styles.step,
                    i === active ? styles.stepActive : "",
                    i < active ? styles.stepDone : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <span className={styles.stepIcon}>
                    {i < active ? <LuCheck /> : <Icon />}
                  </span>
                  <span className={styles.stepLabel}>{s.label}</span>
                </li>
              );
            })}
          </ol>
        </div>

        {/* One segment per step, coloured once the flow reaches it */}
        <div
          className={styles.progress}
          style={{ "--steps": SCENES.length } as Vars}
        >
          {SCENES.map((s, i) => (
            <span
              key={s.key}
              className={[
                styles.progressSeg,
                i < active ? styles.progressDone : "",
                i === active ? styles.progressActive : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <i />
            </span>
          ))}
        </div>

        <div className={styles.stage}>
          {SCENE_VIEWS.map((View, i) => (
            <div
              key={SCENES[i].key}
              className={[styles.scene, i === active ? styles.sceneActive : ""]
                .filter(Boolean)
                .join(" ")}
            >
              <View />
            </div>
          ))}
        </div>
      </div>
      {!reduced && (
        <MotionToggle
          className={styles.motionToggle}
          paused={paused}
          onToggle={() => setPaused((p) => !p)}
          label="a demonstração da plataforma"
          tone="dark"
        />
      )}
    </div>
  );
}

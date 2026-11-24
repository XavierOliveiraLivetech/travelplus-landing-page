"use client";

import { FaPlane } from "react-icons/fa6";
import {
  LuBedDouble,
  LuCheck,
  LuImagePlus,
  LuLock,
} from "react-icons/lu";
import {
  createContext,
  type ReactNode,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { REDUCED_MOTION_QUERY } from "@/lib/motionQueries";
import { useSectionActive } from "@/lib/useSectionActive";
import styles from "./StepVisuals.module.css";
import { assetPath } from "@/lib/assetPath";
import { cx } from "@/lib/cx";

const LOGO_SRC = assetPath("/brand/logo-mark.png");
const AGENCY_DOMAIN = "dominio-personalizado.pt";
/* Mirrors the single 5s CSS timeline (logoCursorMove): typing runs 0.7s → 1.42s. */
const AGENCY_TYPE_START_MS = 700;
const AGENCY_TYPE_STEP_MS = 30;

/* Length of each card's one-shot demo — must match its CSS animations. */
const PLAN_DEMO_MS = 4500;
const AGENCY_DEMO_MS = 5000;
const BOOKING_DEMO_MS = 3500;

/* ——— Steps play in order: a card starts once the one before it is done ——— */

/**
 * active: the card wants to play. onScreen: it is really visible (counts as
 * "sharing the screen" with later cards). done: its demo finished.
 */
type TurnState = { active: boolean; onScreen: boolean; done: boolean };

/**
 * - "sequence": every card fits on screen together (desktop row) — they play
 *   strictly one after another.
 * - "independent": a stacked list taller than the screen (phones / tablets) —
 *   a card plays once it is (almost) fully on screen. Cards sharing the screen
 *   still play in order, but one mostly scrolled away never holds up the next.
 */
type StepSequenceMode = "sequence" | "independent";

const StepTurnContext = createContext<{
  mode: StepSequenceMode;
  states: TurnState[];
  update: (index: number, patch: Partial<TurnState>) => void;
} | null>(null);

/** Share of the card that must be visible before its demo starts… */
const ENTER_RATIO = 0.85;
/** …and below which it counts as gone (and replays on return). The gap stops
 *  small scroll jitters from restarting the demo. */
const LEAVE_RATIO = 0.25;

/** Below this share a playing card no longer holds up the next one. */
const SHARE_RATIO = 0.5;

/** On-screen test with hysteresis, for the "independent" mode. */
function useFullyInView(ref: RefObject<HTMLElement | null>, enabled: boolean) {
  const [inView, setInView] = useState(false);
  const [onScreen, setOnScreen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) {
      setInView(false);
      setOnScreen(false);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        // A card taller than the viewport can never reach ENTER_RATIO:
        // then "fills the screen" counts as fully in view.
        const fill =
          entry.intersectionRect.height /
          Math.max(1, Math.min(entry.boundingClientRect.height, window.innerHeight));
        const ratio = Math.max(entry.intersectionRatio, fill);
        setOnScreen(entry.isIntersecting && ratio >= SHARE_RATIO);
        if (!entry.isIntersecting || ratio < LEAVE_RATIO) setInView(false);
        else if (ratio >= ENTER_RATIO) setInView(true);
      },
      // Top margin: the fixed site header covers that strip of the screen.
      {
        threshold: [0, LEAVE_RATIO, SHARE_RATIO, ENTER_RATIO, 1],
        rootMargin: "-64px 0px 0px 0px",
      },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, enabled]);

  return { inView, onScreen };
}

/**
 * Wrap one layout's list of steps (desktop and mobile each get their own).
 * Only cards actually on screen take part: one that scrolled away never holds
 * up the next, while cards shown together play strictly one after another.
 */
export function StepSequence({
  children,
  mode = "sequence",
}: {
  children: ReactNode;
  mode?: StepSequenceMode;
}) {
  const [states, setStates] = useState<TurnState[]>([]);
  const update = useCallback((index: number, patch: Partial<TurnState>) => {
    setStates((prev) => {
      const next = [...prev];
      const base: TurnState = prev[index] ?? {
        active: false,
        onScreen: false,
        done: false,
      };
      next[index] = { ...base, ...patch };
      return next;
    });
  }, []);
  const value = useMemo(
    () => ({ mode, states, update }),
    [mode, states, update],
  );
  return (
    <StepTurnContext.Provider value={value}>{children}</StepTurnContext.Provider>
  );
}

/**
 * True while this card should play: it is on screen and no earlier card that
 * is also on screen is still playing. Reports itself done after `demoMs`.
 * Dropping out of view resets it, so it replays (in turn) on return.
 */
export function useStepTurn(
  ref: RefObject<HTMLElement | null>,
  index: number,
  demoMs: number,
) {
  const seq = useContext(StepTurnContext);
  const independent = seq?.mode === "independent";
  // Desktop row: visible once the story has faded the section in.
  const shown = useSectionActive(ref);
  const view = useFullyInView(ref, independent);
  const active = independent ? view.inView : shown;
  const onScreen = independent ? view.onScreen : shown;
  const update = seq?.update;
  // Wait for any earlier card that is still playing on screen with this one.
  const blocked =
    seq?.states
      .slice(0, index)
      .some((s) => s?.active && s.onScreen && !s.done) ?? false;
  // Once started, a demo plays to the end: an earlier card scrolling back in
  // must not cut it off half way.
  const [started, setStarted] = useState(false);
  const running = active && (started || !blocked);
  // Only latch once the shared states include this commit's reports — on
  // the first render after cards turn active together, `blocked` is stale.
  const synced = seq ? Boolean(seq.states[index]?.active) === active : true;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- latches the demo once its turn has really started
    if (!active) setStarted(false);
    else if (running && synced) setStarted(true);
  }, [active, running, synced]);

  // Layout effect: report before paint, so cards that become active together
  // never all flash their running state for a frame before queueing up.
  useLayoutEffect(() => {
    update?.(index, { active, done: false });
  }, [update, index, active]);

  useLayoutEffect(() => {
    update?.(index, { onScreen });
  }, [update, index, onScreen]);

  useEffect(() => {
    if (!running || !update) return;
    const id = window.setTimeout(() => update(index, { done: true }), demoMs);
    return () => window.clearTimeout(id);
  }, [update, index, running, demoMs]);

  return running;
}

/**
 * Decorative mini-UI cards for "Como funciona".
 * Purely illustrative — hidden from assistive tech (the step copy carries the meaning).
 */

const PLANS = [
  { name: "Entry", meta: "Básico" },
  { name: "Standard", meta: "Mais popular", popular: true },
  { name: "Premium", meta: "Mais completo" },
  { name: "Enterprise", meta: "À medida" },
] as const;

function PlanCard({ index }: { index: number }) {
  const cardRef = useRef<HTMLDivElement>(null);
  // Start the cursor demo from 0% every time it gets its turn on screen:
  // the running class is dropped while inactive, so CSS restarts at 0%.
  const running = useStepTurn(cardRef, index, PLAN_DEMO_MS);

  return (
    <div
      ref={cardRef}
      className={cx(styles.card, styles.planCard, running && styles.planCardRunning)}
      data-step-card
    >
      <div className={styles.cardHead}>
        <span className={styles.eyebrow}>Plano</span>
      </div>
      <div className={styles.planList}>
        <span className={styles.planHighlight}>
          <span className={styles.planCheck}>
            <LuCheck aria-hidden />
          </span>
        </span>
        {PLANS.map((plan) => (
          <div key={plan.name} className={styles.planRow}>
            <span className={styles.planName}>{plan.name}</span>
            <span
              className={cx(
                styles.planMeta,
                "popular" in plan && plan.popular && styles.planMetaPopular,
              )}
            >
              {plan.meta}
            </span>
          </div>
        ))}
        <span className={styles.planCursor} />
      </div>
    </div>
  );
}

function setAgencyCursorTargets(card: HTMLElement) {
  const rectOf = (el: Element | null) => {
    if (!el) return null;
    const cardRect = card.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return {
      x: r.left + r.width / 2 - cardRect.left,
      y: r.top + r.height / 2 - cardRect.top,
    };
  };

  const field = rectOf(card.querySelector(`.${styles.domainField}`));
  const drop = rectOf(card.querySelector(`.${styles.logoDrop}`));
  const orange = rectOf(card.querySelector(`.${styles.swatchOrange}`));
  const toggle = rectOf(card.querySelector(`.${styles.agencyToggle}`));
  const width = card.getBoundingClientRect().width;

  const startX = Math.min(width - 36, (drop?.x ?? width * 0.72) + width * 0.22);
  const startY = (drop?.y ?? 110) + 28;

  card.style.setProperty("--cursor-start-x", `${startX}px`);
  card.style.setProperty("--cursor-start-y", `${startY}px`);
  card.style.setProperty("--cursor-field-x", `${field?.x ?? width * 0.5}px`);
  card.style.setProperty("--cursor-field-y", `${(field?.y ?? 58) + 2}px`);
  card.style.setProperty("--cursor-drop-x", `${drop?.x ?? width * 0.5}px`);
  card.style.setProperty("--cursor-drop-y", `${drop?.y ?? 110}px`);
  card.style.setProperty("--cursor-orange-x", `${orange?.x ?? width - 28}px`);
  card.style.setProperty("--cursor-orange-y", `${orange?.y ?? 155}px`);
  card.style.setProperty("--cursor-toggle-x", `${toggle?.x ?? width - 32}px`);
  card.style.setProperty("--cursor-toggle-y", `${toggle?.y ?? 190}px`);
}

function AgencyCard({ index }: { index: number }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLSpanElement>(null);
  const [typed, setTyped] = useState(0);
  // Every child animation hangs off the running class, so dropping it while
  // the section is inactive makes the one-shot demo replay from 0% on return.
  const running = useStepTurn(cardRef, index, AGENCY_DEMO_MS);

  useLayoutEffect(() => {
    const el = cardRef.current;
    if (el && running) setAgencyCursorTargets(el);
  }, [running]);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const sync = () => setAgencyCursorTargets(el);
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Typing is the only step CSS can't do cleanly; derive it from the cursor
  // animation's own clock so it always matches the keyframes.
  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor) return;

    if (window.matchMedia(REDUCED_MOTION_QUERY).matches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reduced motion is only known in the browser
      setTyped(AGENCY_DOMAIN.length);
      return;
    }

    if (!running) {
      setTyped(0);
      return;
    }

    // The demo plays once; stop following it once the domain is fully typed.
    let frame = 0;
    const tick = () => {
      const anim = cursor.getAnimations()[0];
      const time = Number(anim?.currentTime ?? 0);
      const next = Math.max(
        0,
        Math.min(
          AGENCY_DOMAIN.length,
          Math.floor((time - AGENCY_TYPE_START_MS) / AGENCY_TYPE_STEP_MS) + 1,
        ),
      );
      setTyped((n) => (n === next ? n : next));
      if (next < AGENCY_DOMAIN.length) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running]);

  return (
    <div
      ref={cardRef}
      data-step-card
      className={cx(
        styles.card,
        styles.agencyCard,
        running && styles.agencyCardRunning,
      )}
    >
      <div className={styles.browserBar}>
        <span className={styles.dots}>
          <i />
          <i />
          <i />
        </span>
        <span className={styles.url}>
          <LuLock aria-hidden />
          <span className={styles.urlText}>{AGENCY_DOMAIN}</span>
        </span>
      </div>
      <div className={styles.brandRow}>
        <span className={styles.logoMark}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className={styles.logoMarkImg}
            src={LOGO_SRC}
            alt=""
            width={152}
            height={82}
          />
        </span>
        <span className={styles.domainField}>
          <span className={styles.domainValue}>
            {AGENCY_DOMAIN.slice(0, typed)}
          </span>
          <span className={styles.domainCaret} />
          {typed === 0 && (
            <span className={styles.domainPlaceholder}>O seu domínio</span>
          )}
        </span>
        <span className={styles.avatars}>
          <i />
          <i />
          <i />
          <b>+4</b>
        </span>
      </div>

      <div className={styles.logoDrop}>
        <span className={styles.logoDropIdle}>
          <LuImagePlus aria-hidden />
          Carregar imagem
        </span>
        <span className={styles.logoDropDone}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_SRC} alt="" width={152} height={82} />
          logo.png
        </span>
      </div>

      <div className={styles.colorRow}>
        <span className={styles.colorLabel}>Cor</span>
        <span className={styles.colorSwatches}>
          <i className={styles.swatchViolet} />
          <i className={styles.swatchBlue} />
          <i className={styles.swatchOrange} />
        </span>
      </div>

      <ul className={styles.setupList}>
        <li className={styles.setupRow}>
          <span>Operadores</span>
          <span className={`${styles.toggle} ${styles.agencyToggle}`} />
        </li>
      </ul>

      <div className={styles.logoDragDemo}>
        <span className={styles.logoDragChip}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_SRC} alt="" width={152} height={82} />
        </span>
        <span ref={cursorRef} className={styles.logoCursor} />
      </div>
    </div>
  );
}

function BookingCard({ index }: { index: number }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const running = useStepTurn(cardRef, index, BOOKING_DEMO_MS);

  return (
    <div
      ref={cardRef}
      className={cx(styles.card, running && styles.bookingCardRunning)}
      data-step-card
    >
      <div className={styles.cardHead}>
        <span className={styles.eyebrow}>Reserva TP-2481</span>
        <span className={styles.chipSuccess}>
          <LuCheck aria-hidden />
          Confirmada
        </span>
      </div>

      <div className={styles.route}>
        <span className={styles.airport}>
          <b>LIS</b>
          <small>08:40</small>
        </span>
        <span className={styles.arc}>
          <svg
            className={styles.arcLine}
            viewBox="0 0 120 32"
            preserveAspectRatio="none"
            aria-hidden
          >
            <path d="M4 28 Q60 -6 116 28" />
          </svg>
          <span className={styles.arcPlane} aria-hidden>
            <FaPlane />
          </span>
        </span>
        <span className={`${styles.airport} ${styles.airportEnd}`}>
          <b>PDL</b>
          <small>10:55</small>
        </span>
      </div>

      <div className={styles.hotelRow}>
        <span className={styles.hotelIcon}>
          <LuBedDouble aria-hidden />
        </span>
        <span className={styles.hotelText}>
          <b>Hotel · 4 noites</b>
          <small>Quarto duplo</small>
          <small>pequeno-almoço incluído</small>
        </span>
      </div>

      <div className={styles.priceRow}>
        <span className={styles.priceLabel}>Valor total</span>
        <span className={styles.bookingPrice}>1200€</span>
      </div>
    </div>
  );
}

const VISUALS = [PlanCard, AgencyCard, BookingCard];

export function StepVisual({ index }: { index: number }) {
  const Visual = VISUALS[index];
  if (!Visual) return null;
  return (
    <div className={styles.visual} aria-hidden="true">
      <Visual index={index} />
    </div>
  );
}

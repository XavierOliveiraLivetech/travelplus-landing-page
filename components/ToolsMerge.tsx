"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  LuBedDouble,
  LuCheck,
  LuCreditCard,
  LuDownload,
  LuFileText,
  LuLock,
  LuMail,
  LuPlane,
  LuPlaneTakeoff,
  LuShieldCheck,
  LuTicket,
  LuX,
} from "react-icons/lu";
import { usePausableTimeout } from "@/lib/usePausableTimeout";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";
import { useSectionActive } from "@/lib/useSectionActive";
import { MotionToggle } from "./MotionToggle";
import styles from "./ToolsMerge.module.css";
import { assetPath } from "@/lib/assetPath";

const LOGO_SRC = assetPath("/brand/logo-mark.png");

/**
 * Decorative closing visual: the consultant's usual mess — one site per
 * service, plus a PDF quote put together by hand — opens tab after tab,
 * then everything collapses into a single TravelPlus window that holds
 * every tool. Hidden from assistive tech (the CTA copy carries the meaning).
 */

type Vars = CSSProperties & Record<`--${string}`, string | number>;

type Phase = "idle" | "scatter" | "merge" | "brand" | "dock" | "platform" | "reset";

/** Timings (ms) — the CSS transitions below are tuned to these. */
const FIRST_WINDOW = 250;
const WINDOW_EVERY = 430;
const SCATTER_HOLD = 1300;
const MERGE_MS = 1050;
/** Card grows in with the big logo centred (~620ms), then holds it for 1s. */
const BRAND_MS = 1650;
/** The logo shrinks back into its place in the header. */
const DOCK_MS = 750;
const PLATFORM_MS = 7400;
const RESET_MS = 650;

type WindowSpec = {
  key: string;
  url: string;
  title: string;
  icon: typeof LuPlane;
  /** Centre of the window inside the stage, in % — plus a slight tilt. */
  x: number;
  y: number;
  r: number;
  /** Optional tag shown at the end of the title row (e.g. the PDF badge). */
  badge?: ReactNode;
  body: () => ReactNode;
};

type Flight = {
  label: string;
  depart: string;
  from: string;
  arrive: string;
  to: string;
  duration: string;
};

const FLIGHT_OUT: Flight = {
  label: "Voo de ida",
  depart: "07:40",
  from: "LIS",
  arrive: "11:05",
  to: "SID",
  duration: "4h25",
};

/**
 * Flight ticket — the same one in the airline window and in the platform.
 * Airport code big, time small: same route layout as the booking card in
 * "Como funciona" (StepVisuals).
 */
function FlightTicket({ flight }: { flight: Flight }) {
  return (
    <span className={styles.flight}>
      <span className={styles.flightMain}>
        <span className={styles.flightEnd}>
          <b>{flight.from}</b>
          <small>{flight.depart}</small>
        </span>
        <span className={styles.flightPath}>
          <small>{flight.duration}</small>
          <i>
            <LuPlane aria-hidden />
          </i>
        </span>
        <span className={`${styles.flightEnd} ${styles.flightEndRight}`}>
          <b>{flight.to}</b>
          <small>{flight.arrive}</small>
        </span>
      </span>
      <span className={styles.flightFoot}>
        <span className={styles.chipSoft}>Bagagem 23 kg</span>
      </span>
    </span>
  );
}

function Lines({ widths }: { widths: number[] }) {
  return (
    <span className={styles.lines}>
      {widths.map((w, i) => (
        <i key={i} style={{ width: `${w}%` }} />
      ))}
    </span>
  );
}

const WINDOWS: WindowSpec[] = [
  {
    key: "voos",
    url: "reservar-voos.pt",
    title: "Lisboa ⇄ Sal",
    icon: LuPlane,
    x: 28,
    y: 22,
    r: -4,
    body: () => (
      <span className={styles.tickets}>
        <span className={styles.ticket}>
          <small className={styles.ticketLabel}>{FLIGHT_OUT.label}</small>
          <FlightTicket flight={FLIGHT_OUT} />
        </span>
      </span>
    ),
  },
  {
    key: "hotel",
    url: "reservar-hoteis.pt",
    title: "Hotéis em Ilha do Sal",
    icon: LuBedDouble,
    x: 72,
    y: 18,
    r: 3,
    body: () => (
      <span className={styles.hotelCard}>
        <span className={styles.hotelCardPhoto} />
        <span className={styles.hotelCardInfo}>
          <b>Hotel Praia Azul</b>
          <span className={styles.hotelCardStars}>★★★★</span>
          <small>Quarto Double Deluxe</small>
          <small>7 noites · Tudo incluído</small>
        </span>
      </span>
    ),
  },
  {
    key: "seguros",
    url: "seguros-de-viagens.pt",
    title: "Seguro de viagem",
    icon: LuShieldCheck,
    x: 25,
    y: 51,
    r: 2,
    body: () => (
      <span className={styles.plans}>
        {[
          ["Entrada", "35€"],
          ["Intermédio", "50€"],
          ["Avançado", "100€"],
        ].map(([name, price]) => (
          <span key={name} className={styles.plan}>
            <small>{name}</small>
            <b>{price}</b>
          </span>
        ))}
      </span>
    ),
  },
  {
    key: "extras",
    url: "extras.pt",
    title: "Bagagem e atividades",
    icon: LuTicket,
    x: 73,
    y: 47,
    r: -2.5,
    body: () => (
      <span className={styles.rows}>
        <span className={styles.row}>
          <span>Bagagem de porão 23 kg</span>
          <b>+50€</b>
        </span>
        <span className={styles.row}>
          <span>Passeio de barco</span>
          <b>+45€</b>
        </span>
      </span>
    ),
  },
  {
    key: "pagamentos",
    url: "pagamento.pt",
    title: "Pagamento",
    icon: LuCreditCard,
    x: 30,
    y: 81,
    r: -2,
    body: () => (
      <>
        <span className={styles.input}>•••• •••• •••• 4821</span>
        <span className={styles.row}>
          <Lines widths={[70]} />
          <span className={styles.fakeBtn}>Pagar</span>
        </span>
      </>
    ),
  },
  {
    key: "orcamento",
    url: "orcamento.pt",
    title: "Orçamento · Ilha do Sal",
    badge: <span className={styles.pdfBadge}>PDF</span>,
    icon: LuFileText,
    x: 70,
    y: 80,
    r: 2.5,
    body: () => (
      <span className={styles.doc}>
        <span className={styles.docTable}>
          {[
            ["Voo", "578€"],
            ["Hotel", "1290€"],
            ["Seguro + extras", "195€"],
            ["Total", "2063€"],
          ].map(([label, value]) => (
            <span key={label}>
              <span>{label}</span>
              <b>{value}</b>
            </span>
          ))}
        </span>
      </span>
    ),
  },
];

/** Insurance + extras chosen for the trip (same numbers as the product demo). */
const ADDONS = [
  { name: "Seguro intermédio", price: "+100€" },
  { name: "Bagagem de porão 23 kg", price: "+50€" },
  { name: "Transfer privado", price: "+60€" },
] as const;

const PRICE_LINES = [
  { label: "Hotel e voos", value: "2042€" },
  { label: "Seguro", value: "+100€" },
  { label: "Extras", value: "+110€" },
] as const;

function BrowserWindow({
  spec,
  index,
  open,
  front,
}: {
  spec: WindowSpec;
  index: number;
  open: boolean;
  front: boolean;
}) {
  const Icon = spec.icon;
  return (
    <div
      className={[styles.win, open ? styles.winOpen : "", front ? styles.winFront : ""]
        .filter(Boolean)
        .join(" ")}
      style={
        {
          "--x": `${spec.x}%`,
          "--y": `${spec.y}%`,
          "--r": `${spec.r}deg`,
          "--i": index,
        } as Vars
      }
    >
      <span className={styles.winBar}>
        <span className={styles.winDots}>
          <i />
          <i />
          <i />
        </span>
        <span className={styles.winUrl}>
          <LuLock aria-hidden />
          {spec.url}
        </span>
        <LuX aria-hidden className={styles.winClose} />
      </span>
      <span className={styles.winBody}>
        <span className={styles.winHead}>
          <span className={styles.winIcon}>
            <Icon aria-hidden />
          </span>
          <b>{spec.title}</b>
          {spec.badge}
        </span>
        {spec.body()}
      </span>
    </div>
  );
}

/** Scale of the logo while it sits in the middle of the card. */
const LOGO_CENTER_SCALE = 3;

function PlatformCard({ phase }: { phase: Phase }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // Distance from the logo's spot in the header to the middle of the card.
  // offset* values ignore transforms, so the card's scale-in doesn't skew it.
  useLayoutEffect(() => {
    if (phase !== "brand") return;
    const measure = () => {
      const card = cardRef.current;
      const logo = logoRef.current;
      if (!card || !logo) return;
      setOffset({
        x: card.offsetWidth / 2 - (logo.offsetLeft + logo.offsetWidth / 2),
        y: card.offsetHeight / 2 - (logo.offsetTop + logo.offsetHeight / 2),
      });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [phase]);

  return (
    <div ref={cardRef} className={styles.platform}>
      <div className={styles.appBar}>
        <span className={styles.dots}>
          <i />
          <i />
          <i />
        </span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={logoRef}
          className={styles.logo}
          src={LOGO_SRC}
          alt=""
          width={152}
          height={82}
          style={
            {
              "--lx": `${offset.x}px`,
              "--ly": `${offset.y}px`,
              "--ls": LOGO_CENTER_SCALE,
            } as Vars
          }
        />
      </div>

      {/* Mirrors the real "A sua viagem" page: timeline + price/payment/quote aside */}
      <div className={styles.trip}>
        <ol className={styles.timeline}>
          <li className={styles.tlItem} style={{ "--at": "200ms" } as Vars}>
            <span className={styles.tlIcon}>
              <LuPlaneTakeoff aria-hidden />
            </span>
            <span className={styles.tlTitle}>
              <b>Voo</b>
            </span>
            <FlightTicket flight={FLIGHT_OUT} />
          </li>

          <li className={styles.tlItem} style={{ "--at": "550ms" } as Vars}>
            <span className={styles.tlIcon}>
              <LuBedDouble aria-hidden />
            </span>
            <span className={styles.tlTitle}>
              <b>Hotel</b>
            </span>
            <span className={styles.hotel}>
              <span className={styles.hotelPhoto} />
              <span className={styles.hotelInfo}>
                <b>Hotel Praia Azul</b>
                <span className={styles.stars}>★★★★</span>
                <small>Double Deluxe · Tudo incluído</small>
              </span>
            </span>
          </li>

          <li className={styles.tlItem} style={{ "--at": "900ms" } as Vars}>
            <span className={styles.tlIcon}>
              <LuShieldCheck aria-hidden />
            </span>
            <span className={styles.tlTitle}>
              <b>Seguro e extras</b>
            </span>
            <span className={styles.addons}>
              {ADDONS.map((addon) => (
                <span key={addon.name} className={styles.addon}>
                  <span>{addon.name}</span>
                  <b>{addon.price}</b>
                </span>
              ))}
            </span>
          </li>
        </ol>

        <div className={styles.aside}>
          <div className={styles.priceBox} style={{ "--at": "1250ms" } as Vars}>
            <b className={styles.boxTitle}>Preço da viagem</b>
            {PRICE_LINES.map((line) => (
              <span key={line.label} className={styles.priceLine}>
                <span>{line.label}</span>
                <span>{line.value}</span>
              </span>
            ))}
            <span className={styles.priceTotal}>
              <span>Total</span>
              <b>2252€</b>
            </span>
          </div>

          <div className={styles.pdfBox} style={{ "--at": "1600ms" } as Vars}>
            <span className={styles.pdfRow}>
              <span className={styles.pdfIcon}>
                <LuFileText aria-hidden />
              </span>
              <b className={styles.pdfText}>PDF Gerado</b>
            </span>
            <span className={styles.pdfActions}>
              <span className={styles.btnSoft}>
                <LuDownload aria-hidden />
                Descarregar
              </span>
              <span className={styles.btnSoft}>
                <LuMail aria-hidden />
                Enviar por e-mail
              </span>
            </span>
          </div>

          <div className={styles.payBox} style={{ "--at": "1950ms" } as Vars}>
            <span className={styles.btnPrimary}>
              <LuCreditCard aria-hidden />
              Efetuar pagamento
              <span className={styles.cursor} />
            </span>
          </div>
        </div>
      </div>

      {/* After the click — same confirmation as the product demo */}
      <div className={styles.success}>
        <span className={styles.successIcon}>
          <LuCheck aria-hidden />
        </span>
        <b>Reserva confirmada</b>
      </div>
    </div>
  );
}

export function ToolsMerge() {
  const rootRef = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const [paused, setPaused] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [opened, setOpened] = useState(0);

  // Runs only while its section is the one actually on screen.
  const inView = useSectionActive(rootRef);

  // Restart from an empty desk every time the section comes back into view
  // (unless the visitor paused it: then the finished platform stays up).
  useEffect(() => {
    if (reduced || paused) return;
    setOpened(0);
    setPhase(inView ? "scatter" : "idle");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, reduced]);

  // What happens next, and after how long, from the current beat.
  const next: { ms: number; run: () => void } | null = (() => {
    switch (phase) {
      case "scatter":
        return opened < WINDOWS.length
          ? {
              ms: opened === 0 ? FIRST_WINDOW : WINDOW_EVERY,
              run: () => setOpened((n) => n + 1),
            }
          : { ms: SCATTER_HOLD, run: () => setPhase("merge") };
      case "merge":
        return { ms: MERGE_MS, run: () => setPhase("brand") };
      case "brand":
        return { ms: BRAND_MS, run: () => setPhase("dock") };
      case "dock":
        return { ms: DOCK_MS, run: () => setPhase("platform") };
      case "platform":
        return { ms: PLATFORM_MS, run: () => setPhase("reset") };
      case "reset":
        return {
          ms: RESET_MS,
          run: () => {
            setOpened(0);
            setPhase("scatter");
          },
        };
      default:
        return null;
    }
  })();

  usePausableTimeout(
    inView && !reduced && next ? next.ms : null,
    () => next?.run(),
    { paused, key: `${phase}-${opened}-${inView}` },
  );

  // Paused (or reduced motion): skip straight to the finished TravelPlus
  // platform, shown still — the end of the story rather than a frozen frame.
  const still = reduced || paused;
  const running = !still && inView;
  const shown: Phase = still ? "platform" : phase;

  // The pause button lives in the platform card's app bar (right of the
  // logo). It can't sit inside the aria-hidden stage, so measure where that
  // bar is and pin the button there; it stays put while the card is hidden.
  useLayoutEffect(() => {
    const root = rootRef.current;
    const stage = root?.querySelector<HTMLElement>(`.${styles.stage}`);
    const card = stage?.querySelector<HTMLElement>(`.${styles.platform}`);
    const bar = card?.querySelector<HTMLElement>(`.${styles.appBar}`);
    if (!root || !stage || !card || !bar) return;

    const place = () => {
      // offset* ignore the card's transform: its resting, centred position.
      const left = stage.offsetLeft + card.offsetLeft - card.offsetWidth / 2;
      const top = stage.offsetTop + card.offsetTop - card.offsetHeight / 2;
      const inset = parseFloat(getComputedStyle(bar).paddingRight) || 0;
      root.style.setProperty("--toggle-x", `${left + card.offsetWidth - inset}px`);
      root.style.setProperty(
        "--toggle-y",
        `${top + bar.offsetTop + bar.offsetHeight / 2}px`,
      );
    };

    place();
    const observer = new ResizeObserver(place);
    observer.observe(stage);
    observer.observe(card);
    return () => observer.disconnect();
  }, [reduced]);

  // Resuming replays the demo from an empty desk.
  const togglePaused = () => {
    if (paused) {
      setOpened(0);
      setPhase(inView ? "scatter" : "idle");
    }
    setPaused(!paused);
  };
  const windowsUp = shown === "scatter" || shown === "merge";

  return (
    <div
      ref={rootRef}
      className={[
        styles.visual,
        running ? styles.running : "",
        paused ? styles.paused : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-phase={shown}
    >
      <div className={styles.stage} aria-hidden="true">
        {WINDOWS.map((spec, i) => (
          <BrowserWindow
            key={spec.key}
            spec={spec}
            index={i}
            open={windowsUp && i < opened}
            front={shown === "scatter" && i === opened - 1}
          />
        ))}
        <span className={styles.core} />
        <PlatformCard phase={shown} />
      </div>
      {!reduced && (
        <MotionToggle
          className={styles.motionToggle}
          paused={paused}
          onToggle={togglePaused}
          label="a animação da plataforma"
          titles={{ running: "Terminar animação", paused: "Iniciar animação" }}
        />
      )}
    </div>
  );
}

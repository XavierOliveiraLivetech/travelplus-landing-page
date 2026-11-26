"use client";

import { useEffect, useRef, useState } from "react";
import type { IconType } from "react-icons";
import {
  LuArrowRight,
  LuCheck,
  LuCreditCard,
  LuExternalLink,
  LuLandmark,
  LuLoaderCircle,
  LuMail,
  LuReceipt,
  LuSmartphone,
} from "react-icons/lu";
import {
  AdesaoError,
  concluirSubscricao,
  confirmarCodigo,
  enviarCodigo,
  mascararEmail,
  METODOS_PAGAMENTO,
  procurarRnavt,
  type AgenciaRnavt,
  type MetodoPagamento,
} from "@/lib/adesao";
import { cx } from "@/lib/cx";
import {
  DURACAO_LABELS,
  DURACAO_PERIOD_SUFFIX,
  formatPlanoPrice,
  PLATFORM_URL,
  type DuracaoSubscricao,
  type Plano,
} from "@/lib/site-data";
import styles from "./adesao.module.css";

const PASSOS = [
  "Plano",
  "Subscrição",
  "Agência",
  "Email",
  "Verificação",
  "Pagamento",
  "Acesso",
];
const PLANO = 0;
const DURACAO = 1;
const AGENCIA = 2;
const EMAIL = 3;
const CODIGO = 4;
const PAGAMENTO = 5;
const FIM = 6;
const RESEND_SECONDS = 30;
const MESES: Record<DuracaoSubscricao, number> = { mensal: 1, semestral: 6, anual: 12 };

const METODO_ICONS: Record<MetodoPagamento, IconType> = {
  cartao: LuCreditCard,
  mbway: LuSmartphone,
  multibanco: LuReceipt,
  debito_direto: LuLandmark,
};

type AdesaoWizardProps = {
  planos: Plano[];
  selectedSlug: string;
  onSelectPlano: (slug: string) => void;
  duracao: DuracaoSubscricao;
  onDuracaoChange: (duracao: DuracaoSubscricao) => void;
  /** Enterprise não subscreve aqui: passa para o pedido de contacto comercial. */
  onEnterprise: () => void;
};

/** Poupança face a pagar mês a mês durante o mesmo período (0 quando não há). */
function poupanca(plano: Plano, duracao: DuracaoSubscricao) {
  const mensal = plano.precos.mensal;
  const preco = plano.precos[duracao];
  if (mensal === null || preco === null || MESES[duracao] === 1) return 0;
  return Math.round((1 - preco / (mensal * MESES[duracao])) * 100);
}

/**
 * Switching plans closes one feature list while the next one opens. Both
 * end at the same height, but mid-animation the two don't always add up,
 * so the card briefly shrinks and grows back. Holding the list's current
 * height until the animation ends keeps the card still.
 */
function holdHeight(element: HTMLElement | null) {
  if (!element) return;
  element.style.minHeight = `${element.getBoundingClientRect().height}px`;
  window.setTimeout(() => {
    element.style.minHeight = "";
  }, 450);
}

function mensagemErro(error: unknown) {
  return error instanceof AdesaoError
    ? error.message
    : "Não foi possível continuar. Verifique a ligação e tente outra vez.";
}

/** Error text under a field, named by the field's aria-describedby. */
function FieldError({ id, message }: { id: string; message: string | null }) {
  if (!message) return null;
  return (
    <p id={id} className={styles.fieldError} role="alert">
      {message}
    </p>
  );
}

export function AdesaoWizard({
  planos,
  selectedSlug,
  onSelectPlano,
  duracao,
  onDuracaoChange,
  onEnterprise,
}: AdesaoWizardProps) {
  const [step, setStep] = useState(PLANO);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [rnavt, setRnavt] = useState("");
  const [agencia, setAgencia] = useState<AgenciaRnavt | null>(null);
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const [resent, setResent] = useState(false);
  const [metodo, setMetodo] = useState<MetodoPagamento | null>(null);

  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const slideRef = useRef<HTMLDivElement | null>(null);
  const firstRender = useRef(true);

  const plano = planos.find((p) => p.slug === selectedSlug) ?? null;
  const isEnterprise = plano?.requires_sales_contact ?? false;
  const price = plano ? plano.precos[duracao] : null;
  const done = step === FIM;
  const errorId = `adesao-erro-${step}`;
  const describedBy = error ? errorId : undefined;

  // New slide: move focus to its heading so keyboard and screen-reader users follow along.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus({ preventScroll: true });
    headingRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [step]);

  // Failed check: focus the field that needs fixing (its error is announced by role="alert").
  useEffect(() => {
    if (!error) return;
    const slide = slideRef.current;
    const control =
      slide?.querySelector<HTMLInputElement>('input[aria-invalid="true"]') ??
      slide?.querySelector<HTMLInputElement>('fieldset[aria-invalid="true"] input:checked') ??
      slide?.querySelector<HTMLInputElement>('fieldset[aria-invalid="true"] input');
    control?.focus();
  }, [error]);

  // Countdown for "Reenviar código".
  useEffect(() => {
    if (resendIn <= 0) return;
    const id = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [resendIn]);

  function go(next: number) {
    setDirection(next > step ? "forward" : "back");
    setError(null);
    setStep(next);
  }

  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await task();
    } catch (err) {
      setError(mensagemErro(err));
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    if (step === PLANO) {
      if (!plano) return setError("Escolha um plano para continuar.");
      if (isEnterprise) return onEnterprise();
      go(DURACAO);
    } else if (step === DURACAO) {
      if (price === null) return setError("Escolha durante quanto tempo quer subscrever.");
      go(AGENCIA);
    } else if (step === AGENCIA) {
      if (!/^\d{1,6}$/.test(rnavt)) {
        return setError("Escreva o número RNAVT da agência, só com algarismos.");
      }
      void run(async () => {
        const found = await procurarRnavt(rnavt);
        setAgencia(found);
        if (!found.emails.includes(email)) setEmail("");
        go(EMAIL);
      });
    } else if (step === EMAIL) {
      if (!email) return setError("Escolha o email que fica associado à conta.");
      void run(async () => {
        await enviarCodigo(email);
        setCodigo("");
        setResent(false);
        setResendIn(RESEND_SECONDS);
        go(CODIGO);
      });
    } else if (step === CODIGO) {
      if (!/^\d{6}$/.test(codigo)) {
        return setError("Escreva os 6 algarismos do código que enviámos por email.");
      }
      void run(async () => {
        await confirmarCodigo(email, codigo);
        go(PAGAMENTO);
      });
    } else if (step === PAGAMENTO) {
      if (!metodo || !plano) return setError("Escolha como quer pagar a subscrição.");
      void run(async () => {
        await concluirSubscricao({ rnavt, email, plano: plano.slug, duracao, metodo });
        go(FIM);
      });
    }
  }

  function resend() {
    if (busy || resendIn > 0) return;
    void run(async () => {
      await enviarCodigo(email);
      setResent(true);
      setResendIn(RESEND_SECONDS);
    });
  }

  const submitLabel =
    step === PLANO && isEnterprise
      ? "Pedir contacto comercial"
      : step === EMAIL
        ? "Enviar código"
        : step === PAGAMENTO
          ? "Concluir subscrição"
          : "Continuar";

  return (
    <div className={styles.shell}>
      <aside className={styles.rail}>
        <h1 className={styles.title}>Aderir ao TravelPlus</h1>
        <div className={styles.mobileProgress}>
          <p className={styles.progressText}>
            Passo {step + 1} de {PASSOS.length}
            <span aria-hidden="true"> · </span>
            <strong>{PASSOS[step]}</strong>
          </p>
          <div className={styles.progressBar} aria-hidden="true">
            <span style={{ transform: `scaleX(${(step + 1) / PASSOS.length})` }} />
          </div>
        </div>
        <nav aria-label="Passos da adesão">
          <ol className={styles.steps}>
            {PASSOS.map((label, i) => {
              const isCurrent = i === step;
              const isDone = i < step || done;
              // Finished steps stay reachable until the subscription is done.
              const canReturn = i < step && !done && !busy;
              const content = (
                <>
                  <span className={styles.stepDot} aria-hidden="true">
                    {isDone ? <LuCheck /> : i + 1}
                  </span>
                  <span className={styles.stepLabel}>{label}</span>
                  {isDone ? <span className={styles.visuallyHidden}> (concluído)</span> : null}
                </>
              );
              return (
                <li
                  key={label}
                  className={cx(
                    styles.step,
                    isDone && styles.stepDone,
                    isCurrent && !done && styles.stepCurrent,
                  )}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {canReturn ? (
                    <button type="button" className={styles.stepButton} onClick={() => go(i)}>
                      {content}
                    </button>
                  ) : (
                    <span className={styles.stepButton}>{content}</span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      </aside>

      <div className={styles.panel}>
        <p className={styles.visuallyHidden} aria-live="polite">
          Passo {step + 1} de {PASSOS.length}: {PASSOS[step]}
        </p>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <div
            key={step}
            ref={slideRef}
            className={cx(styles.slide, direction === "back" && styles.slideBack)}
          >
            {step === PLANO ? (
              <>
                <header className={styles.slideHead}>
                  <h2 ref={headingRef} tabIndex={-1} className={styles.slideTitle}>
                    Escolha o plano da agência
                  </h2>
                  <p className={styles.slideLead}>
                    Pode mudar de plano mais tarde, a partir da plataforma.
                  </p>
                </header>
                <fieldset
                  className={styles.options}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={describedBy}
                >
                  <legend className={styles.visuallyHidden}>Plano</legend>
                  {planos.map((option) => {
                    const active = selectedSlug === option.slug;
                    return (
                      <label
                        key={option.slug}
                        className={cx(styles.option, active && styles.optionActive)}
                      >
                        <input
                          type="radio"
                          name="plano"
                          value={option.slug}
                          checked={active}
                          onChange={(e) => {
                            holdHeight(e.currentTarget.closest("fieldset"));
                            onSelectPlano(option.slug);
                            setError(null);
                          }}
                        />
                        <span className={styles.radio} aria-hidden="true" />
                        <span className={styles.optionBody}>
                          <span className={styles.optionName}>
                            {option.nome}
                            {option.highlighted ? (
                              <span className={cx(styles.badge, styles.badgeSoft)}>Mais escolhido</span>
                            ) : null}
                          </span>
                          <span className={styles.optionText}>{option.descricao}</span>
                          <span
                            className={cx(styles.includesWrap, active && styles.includesOpen)}
                            aria-hidden={!active}
                            inert={!active}
                          >
                            <span className={styles.includesClip}>
                              {/* Every plan's list sits in the same grid cell; only this
                                  plan's is visible. The open card always takes the height
                                  of the longest list, so the form keeps one height
                                  whichever plan is picked. */}
                              <span className={styles.includesStack}>
                                {planos.map((p) => (
                                  <ul
                                    key={p.slug}
                                    className={cx(
                                      styles.includes,
                                      p.slug !== option.slug && styles.includesSizer,
                                    )}
                                    aria-hidden={p.slug !== option.slug ? true : undefined}
                                  >
                                    {p.feature_highlights.map((item) => (
                                      <li key={item}>
                                        <LuCheck aria-hidden="true" />
                                        {item}
                                      </li>
                                    ))}
                                  </ul>
                                ))}
                              </span>
                            </span>
                          </span>
                        </span>
                        <span className={styles.optionPrice}>
                          {option.requires_sales_contact || option.precos.mensal === null ? (
                            <span className={styles.optionPriceNote}>Sob consulta</span>
                          ) : (
                            <>
                              <strong>{formatPlanoPrice(option.precos.mensal)}</strong>
                              <small>/ mês</small>
                            </>
                          )}
                        </span>
                      </label>
                    );
                  })}
                </fieldset>
                <FieldError id={errorId} message={error} />
              </>
            ) : null}

            {step === DURACAO && plano ? (
              <>
                <header className={styles.slideHead}>
                  <h2 ref={headingRef} tabIndex={-1} className={styles.slideTitle}>
                    Escolha a duração
                  </h2>
                  <p className={styles.slideLead}>
                    Plano {plano.nome}. Quanto mais longo o período, menos paga por mês.
                  </p>
                </header>
                <fieldset
                  className={styles.options}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={describedBy}
                >
                  <legend className={styles.visuallyHidden}>Duração</legend>
                  {(Object.keys(DURACAO_LABELS) as DuracaoSubscricao[]).map((key) => {
                    const optionPrice = plano.precos[key];
                    if (optionPrice === null) return null;
                    const saving = poupanca(plano, key);
                    const active = duracao === key;
                    return (
                      <label key={key} className={cx(styles.option, active && styles.optionActive)}>
                        <input
                          type="radio"
                          name="duracao"
                          value={key}
                          checked={active}
                          onChange={() => {
                            onDuracaoChange(key);
                            setError(null);
                          }}
                        />
                        <span className={styles.radio} aria-hidden="true" />
                        <span className={styles.optionBody}>
                          <span className={styles.optionName}>
                            {DURACAO_LABELS[key]}
                            {saving > 0 ? (
                              <span className={cx(styles.badge, styles.badgeSoft)}>Poupa {saving}%</span>
                            ) : null}
                          </span>
                          <span className={styles.optionText}>
                            {MESES[key] > 1
                              ? `Equivale a ${formatPlanoPrice(Math.round(optionPrice / MESES[key]))} por mês`
                              : "Pago mês a mês"}
                          </span>
                        </span>
                        <span className={styles.optionPrice}>
                          <strong>{formatPlanoPrice(optionPrice)}</strong>
                          <small>{DURACAO_PERIOD_SUFFIX[key]}</small>
                        </span>
                      </label>
                    );
                  })}
                </fieldset>
                <FieldError id={errorId} message={error} />
              </>
            ) : null}

            {step === AGENCIA ? (
              <>
                <header className={styles.slideHead}>
                  <h2 ref={headingRef} tabIndex={-1} className={styles.slideTitle}>
                    Identifique a sua agência
                  </h2>
                  <p className={styles.slideLead}>
                    O RNAVT vai servir para encontrarmos os emails que tem registados na sua
                    agência.
                  </p>
                </header>
                <div className={styles.field}>
                  <div className={styles.float}>
                  <input
                    id="rnavt"
                    name="rnavt"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    autoComplete="off"
                    placeholder=" "
                    value={rnavt}
                    onChange={(e) => {
                      setRnavt(e.target.value.replace(/\D/g, ""));
                      setError(null);
                    }}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={describedBy}
                    className={styles.inputNumber}
                  />
                  <label htmlFor="rnavt">Número RNAVT</label>
                  </div>
                  <FieldError id={errorId} message={error} />
                </div>
              </>
            ) : null}

            {step === EMAIL && agencia ? (
              <>
                <header className={styles.slideHead}>
                  <h2 ref={headingRef} tabIndex={-1} className={styles.slideTitle}>
                    Escolha o email da conta
                  </h2>
                  <p className={styles.slideLead}>
                    Encontrámos <strong>{agencia.nome}</strong>. Enviamos o código de
                    verificação para o email que escolher.
                  </p>
                </header>
                <fieldset
                  className={styles.options}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={describedBy}
                >
                  <legend className={styles.visuallyHidden}>Email da conta</legend>
                  {agencia.emails.map((option) => {
                    const active = email === option;
                    return (
                      <label
                        key={option}
                        className={cx(styles.option, styles.optionCompact, active && styles.optionActive)}
                      >
                        <input
                          type="radio"
                          name="email"
                          value={option}
                          checked={active}
                          onChange={() => {
                            setEmail(option);
                            setError(null);
                          }}
                        />
                        <span className={styles.radio} aria-hidden="true" />
                        <span className={styles.optionBody}>
                          <span className={styles.optionName}>{mascararEmail(option)}</span>
                        </span>
                        <LuMail className={styles.optionIcon} aria-hidden="true" />
                      </label>
                    );
                  })}
                </fieldset>
                <FieldError id={errorId} message={error} />
              </>
            ) : null}

            {step === CODIGO ? (
              <>
                <header className={styles.slideHead}>
                  <h2 ref={headingRef} tabIndex={-1} className={styles.slideTitle}>
                    Confirme o email
                  </h2>
                  <p className={styles.slideLead}>
                    Enviámos um código de 6 algarismos para <strong>{mascararEmail(email)}</strong>.
                  </p>
                </header>
                <div className={styles.field}>
                  <div className={styles.float}>
                  <input
                    id="codigo"
                    name="codigo"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    autoComplete="one-time-code"
                    placeholder=" "
                    value={codigo}
                    onChange={(e) => {
                      setCodigo(e.target.value.replace(/\D/g, ""));
                      setError(null);
                    }}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={describedBy}
                    className={styles.inputCode}
                  />
                  <label htmlFor="codigo">Código de verificação</label>
                  </div>
                  <FieldError id={errorId} message={error} />
                </div>
                <div className={styles.inlineActions}>
                  <button
                    type="button"
                    className={styles.textButton}
                    onClick={resend}
                    disabled={busy || resendIn > 0}
                  >
                    {resendIn > 0 ? `Reenviar código em ${resendIn}s` : "Reenviar código"}
                  </button>
                  <button
                    type="button"
                    className={styles.textButton}
                    onClick={() => go(EMAIL)}
                    disabled={busy}
                  >
                    Usar outro email
                  </button>
                </div>
                {resent ? (
                  <p className={styles.notice} role="status">
                    Enviámos um novo código. O anterior deixou de ser válido.
                  </p>
                ) : null}
              </>
            ) : null}

            {step === PAGAMENTO && plano ? (
              <>
                <header className={styles.slideHead}>
                  <h2 ref={headingRef} tabIndex={-1} className={styles.slideTitle}>
                    Escolha como pagar
                  </h2>
                  <p className={styles.slideLead}>
                    Plano {plano.nome}, {DURACAO_LABELS[duracao].toLowerCase()}:{" "}
                    <strong>
                      {price !== null ? formatPlanoPrice(price) : "—"} {DURACAO_PERIOD_SUFFIX[duracao]}
                    </strong>
                  </p>
                </header>
                <fieldset
                  className={cx(styles.options, styles.optionsGrid)}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={describedBy}
                >
                  <legend className={styles.visuallyHidden}>Método de pagamento</legend>
                  {METODOS_PAGAMENTO.map((option) => {
                    const active = metodo === option.id;
                    const Icon = METODO_ICONS[option.id];
                    return (
                      <label
                        key={option.id}
                        className={cx(styles.option, styles.optionTile, active && styles.optionActive)}
                      >
                        <input
                          type="radio"
                          name="metodo"
                          value={option.id}
                          checked={active}
                          onChange={() => {
                            setMetodo(option.id);
                            setError(null);
                          }}
                        />
                        <span className={styles.tileIcon} aria-hidden="true">
                          <Icon />
                        </span>
                        <span className={cx(styles.radio, styles.checkbox)} aria-hidden="true" />
                        <span className={styles.optionBody}>
                          <span className={styles.optionName}>{option.label}</span>
                          <span className={styles.optionText}>{option.descricao}</span>
                        </span>
                      </label>
                    );
                  })}
                </fieldset>
                <FieldError id={errorId} message={error} />
              </>
            ) : null}

            {step === FIM && plano ? (
              <div className={styles.doneSlide}>
                <span className={styles.doneIcon} aria-hidden="true">
                  <LuCheck />
                </span>
                <h2 ref={headingRef} tabIndex={-1} className={styles.doneTitle}>
                  Subscrição concluída
                </h2>
                <p className={styles.slideLead}>
                  Vamos enviar um email para <strong>{mascararEmail(email)}</strong> com um link
                  para definir o nome de utilizador e a palavra-passe da conta.
                </p>
                <dl className={styles.recap}>
                  <div>
                    <dt>Plano</dt>
                    <dd>{plano.nome}</dd>
                  </div>
                  <div>
                    <dt>Duração</dt>
                    <dd>{DURACAO_LABELS[duracao]}</dd>
                  </div>
                  <div>
                    <dt>Valor</dt>
                    <dd>
                      {price !== null ? formatPlanoPrice(price) : "—"} {DURACAO_PERIOD_SUFFIX[duracao]}
                    </dd>
                  </div>
                  <div>
                    <dt>RNAVT</dt>
                    <dd>{rnavt}</dd>
                  </div>
                </dl>
                <a
                  href={PLATFORM_URL}
                  className={styles.primary}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Entrar na plataforma
                  <LuExternalLink aria-hidden="true" />
                  <span className={styles.visuallyHidden}> (abre num novo separador)</span>
                </a>
              </div>
            ) : null}
          </div>

          {!done ? (
            <div className={styles.actions}>
              {step > PLANO ? (
                <button
                  type="button"
                  className={styles.prev}
                  onClick={() => go(step - 1)}
                  disabled={busy}
                >
                  Voltar
                </button>
              ) : null}
              <button type="submit" className={styles.next} disabled={busy} aria-busy={busy}>
                {busy ? (
                  <>
                    <LuLoaderCircle className={styles.spinner} aria-hidden="true" />
                    A verificar…
                  </>
                ) : (
                  <>
                    {submitLabel}
                    <LuArrowRight aria-hidden="true" />
                  </>
                )}
              </button>
            </div>
          ) : null}
        </form>
      </div>
    </div>
  );
}

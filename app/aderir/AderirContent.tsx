"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { returnHref } from "@/lib/returnSection";
import {
  CONTACT_EMAIL,
  DURACAO_LABELS,
  formatPlanoPrice,
  SALES_EMAIL,
  type DuracaoSubscricao,
  type Plano,
} from "@/lib/site-data";
import styles from "./aderir.module.css";
import { assetPath } from "@/lib/assetPath";

type AderirContentProps = {
  planos: Plano[];
};

type FieldError = { id: string; message: string };

function buildMailto(to: string, subject: string, body: string): string {
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/** Trimmed text value of a form field ("" when missing). */
function readText(data: FormData, name: string) {
  return String(data.get(name) ?? "").trim();
}

function RequiredHint() {
  return (
    <p className={styles.formHint}>
      Os campos marcados com <span className={styles.required}>*</span> são
      obrigatórios.
    </p>
  );
}

/**
 * One labelled form input. `error` is the current validation message (null
 * when valid); fields that are never validated pass `validated={false}` so
 * they get no aria-invalid / aria-describedby.
 */
function Field({
  id,
  label,
  required = false,
  type,
  autoComplete,
  placeholder,
  hint,
  error = null,
  validated = true,
}: {
  id: string;
  label: string;
  required?: boolean;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  hint?: string;
  error?: string | null;
  validated?: boolean;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <label className={styles.field} htmlFor={id}>
      <span>
        {label}
        {required ? (
          <>
            {" "}
            <abbr className={styles.required} title="Obrigatório" aria-hidden="true">
              *
            </abbr>
          </>
        ) : null}
      </span>
      <input
        id={id}
        name={id}
        type={type}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={validated ? Boolean(error) : undefined}
        aria-describedby={
          validated ? (error ? `${id}-error` : hintId) : undefined
        }
      />
      {hint ? (
        <span id={hintId} className={styles.fieldHint}>
          {hint}
        </span>
      ) : null}
      {error ? <em id={`${id}-error`}>{error}</em> : null}
    </label>
  );
}

export function AderirContent({ planos }: AderirContentProps) {
  const defaultSlug =
    planos.find((p) => !p.requires_sales_contact)?.slug ?? planos[0]?.slug ?? "";

  const [selectedSlug, setSelectedSlug] = useState(defaultSlug);
  // Preselect the plan from ?plano= (e.g. /aderir?plano=enterprise).
  useEffect(() => {
    const plano = new URLSearchParams(window.location.search).get("plano")?.trim();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- ?plano= only exists in the browser (static export)
    if (plano && planos.some((p) => p.slug === plano)) setSelectedSlug(plano);
  }, [planos]);
  const [duracao, setDuracao] = useState<DuracaoSubscricao>("mensal");
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [successMailto, setSuccessMailto] = useState<string | null>(null);
  const errorSummaryRef = useRef<HTMLDivElement | null>(null);
  // "Voltar ao site" returns to the section the visitor came from.
  const [backHref, setBackHref] = useState("/");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage is only readable after hydration
    setBackHref(returnHref());
  }, []);

  const selectedPlano = useMemo(
    () => planos.find((p) => p.slug === selectedSlug) ?? null,
    [planos, selectedSlug],
  );

  const isEnterprise = selectedPlano?.requires_sales_contact ?? false;

  const selectedPrice = useMemo(() => {
    if (!selectedPlano || isEnterprise) {
      return null;
    }

    return selectedPlano.precos[duracao];
  }, [selectedPlano, duracao, isEnterprise]);

  function validate(form: HTMLFormElement): FieldError[] {
    const data = new FormData(form);
    const next: FieldError[] = [];

    const agencyName = readText(data, "agency_name");
    if (!agencyName) {
      next.push({ id: "agency_name", message: "Indique o nome da agência." });
    }

    if (isEnterprise) {
      const contactName = readText(data, "contact_name");
      const contactEmail = readText(data, "contact_email");

      if (!contactName) {
        next.push({
          id: "contact_name",
          message: "Indique o nome de contacto.",
        });
      }
      if (!contactEmail) {
        next.push({ id: "contact_email", message: "Indique o email de contacto." });
      } else if (!isValidEmail(contactEmail)) {
        next.push({
          id: "contact_email",
          message: "Indique um email de contacto válido.",
        });
      }
    } else {
      const agencyCode = readText(data, "agency_code");
      const agencyEmail = readText(data, "email");
      const adminName = readText(data, "admin_name");
      const adminEmail = readText(data, "admin_email");

      if (agencyCode && !/^[A-Za-z0-9_-]+$/.test(agencyCode)) {
        next.push({
          id: "agency_code",
          message:
            "O código da agência só pode conter letras, números, hífen e underscore.",
        });
      }
      if (agencyEmail && !isValidEmail(agencyEmail)) {
        next.push({
          id: "email",
          message: "Indique um email geral da agência válido.",
        });
      }
      if (!adminName) {
        next.push({
          id: "admin_name",
          message: "Indique o nome completo do administrador.",
        });
      }
      if (!adminEmail) {
        next.push({
          id: "admin_email",
          message: "Indique o email do administrador.",
        });
      } else if (!isValidEmail(adminEmail)) {
        next.push({
          id: "admin_email",
          message: "Indique um email de administrador válido.",
        });
      }
    }

    return next;
  }

  function fieldError(id: string) {
    return errors.find((error) => error.id === id)?.message ?? null;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccessMailto(null);

    const form = event.currentTarget;
    const nextErrors = validate(form);
    setErrors(nextErrors);

    if (nextErrors.length > 0) {
      requestAnimationFrame(() => {
        errorSummaryRef.current?.focus();
      });
      return;
    }

    const formData = new FormData(form);

    let mailto = "";

    if (isEnterprise) {
      const body = [
        "Pedido Enterprise TravelPlus",
        "",
        `Agência: ${formData.get("agency_name") ?? ""}`,
        `Contacto: ${formData.get("contact_name") ?? ""}`,
        `Email: ${formData.get("contact_email") ?? ""}`,
        `Telefone: ${formData.get("telefone") ?? "—"}`,
        "",
        "Mensagem:",
        String(formData.get("message") ?? "—"),
      ].join("\n");

      mailto = buildMailto(
        SALES_EMAIL,
        `TravelPlus Enterprise — ${formData.get("agency_name") ?? ""}`,
        body,
      );
    } else {
      const price =
        selectedPrice !== null ? formatPlanoPrice(selectedPrice) : "—";
      const body = [
        "Pedido de subscrição TravelPlus",
        "",
        `Plano: ${selectedPlano?.nome ?? selectedSlug}`,
        `Duração: ${DURACAO_LABELS[duracao]}`,
        `Preço: ${price}`,
        "",
        `Agência: ${formData.get("agency_name") ?? ""}`,
        `Código: ${formData.get("agency_code") ?? "—"}`,
        `Email agência: ${formData.get("email") ?? "—"}`,
        `Telefone: ${formData.get("telefone") ?? "—"}`,
        "",
        `Administrador: ${formData.get("admin_name") ?? ""}`,
        `Email admin: ${formData.get("admin_email") ?? ""}`,
      ].join("\n");

      mailto = buildMailto(
        CONTACT_EMAIL,
        `Aderir ao TravelPlus — ${formData.get("agency_name") ?? ""}`,
        body,
      );
    }

    setSuccessMailto(mailto);

    try {
      window.location.href = mailto;
    } catch {
      // Mailto may fail silently; success panel keeps a manual fallback link.
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.logoLink} aria-label="TravelPlus">
            <Image
              src={assetPath("/brand/logo-mark.png")}
              alt="TravelPlus"
              width={140}
              height={56}
              className={styles.logoImg}
              priority
            />
          </Link>
          <Link href={backHref} className={styles.backLink}>
            ← Voltar ao site
          </Link>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.intro}>
          <h1 className={styles.title}>Aderir ao TravelPlus</h1>
          <p className={styles.lead}>
            Escolha o plano ideal para a sua agência e envie o pedido. Nós tratamos do resto.
          </p>
        </div>

        <div className={styles.layout}>
          <aside className={styles.column}>
            <div className={styles.card}>
            <h2 className={styles.sectionLabel}>Plano</h2>
            <ul className={styles.planList}>
              {planos.map((plano) => {
                const active = plano.slug === selectedSlug;
                return (
                  <li key={plano.slug}>
                    <button
                      type="button"
                      className={
                        active ? styles.planOptionActive : styles.planOption
                      }
                      onClick={() => {
                        setSelectedSlug(plano.slug);
                        setErrors([]);
                        setSuccessMailto(null);
                      }}
                    >
                      <span className={styles.planOptionName}>{plano.nome}</span>
                      <span className={styles.planOptionPrice}>
                        {plano.requires_sales_contact
                          ? "Sob consulta"
                          : `${formatPlanoPrice(plano.precos.mensal)}/mês`}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {selectedPlano ? (
              <>
                <h3 className={styles.includedLabel}>Incluído no plano</h3>
                <ul className={styles.highlights}>
                  {selectedPlano.feature_highlights.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </>
            ) : null}
            </div>

            {selectedPlano && !isEnterprise ? (
              <div className={styles.card}>
                <h2 className={styles.sectionLabel}>Duração</h2>
                <div className={styles.duracaoOptions}>
                  {(Object.keys(DURACAO_LABELS) as DuracaoSubscricao[]).map(
                    (key) => {
                      const price = selectedPlano.precos[key];
                      if (price === null) {
                        return null;
                      }

                      return (
                        <label
                          key={key}
                          className={
                            duracao === key
                              ? styles.duracaoActive
                              : styles.duracaoOption
                          }
                        >
                          <input
                            type="radio"
                            name="duracao"
                            value={key}
                            checked={duracao === key}
                            onChange={() => setDuracao(key)}
                          />
                          <span>{DURACAO_LABELS[key]}</span>
                          <strong>{formatPlanoPrice(price)}</strong>
                        </label>
                      );
                    },
                  )}
                </div>
              </div>
            ) : null}
          </aside>

          <section className={styles.column}>
            {successMailto ? (
              <div className={styles.success} role="status">
                <p>
                  Pedido preparado. Se o cliente de email não abriu, use o link
                  abaixo para enviar manualmente.
                </p>
                <p>
                  <a href={successMailto}>Abrir pedido por email</a>
                  {" · "}
                  Destino: {isEnterprise ? SALES_EMAIL : CONTACT_EMAIL}
                </p>
              </div>
            ) : null}

            <form className={styles.form} onSubmit={handleSubmit} noValidate>
              {errors.length > 0 ? (
                <div
                  ref={errorSummaryRef}
                  className={styles.formError}
                  role="alert"
                  tabIndex={-1}
                  aria-labelledby="aderir-error-title"
                >
                  <strong id="aderir-error-title">
                    Corrija os seguintes campos:
                  </strong>
                  <ul className={styles.errorList}>
                    {errors.map((error) => (
                      <li key={error.id}>
                        <a href={`#${error.id}`}>{error.message}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {isEnterprise ? (
                <div className={styles.card}>
                  <h2 className={styles.formTitle}>Pedido Enterprise</h2>
                  <RequiredHint />
                  <Field
                    id="agency_name"
                    label="Nome da agência"
                    required
                    autoComplete="organization"
                    error={fieldError("agency_name")}
                  />
                  <Field
                    id="contact_name"
                    label="Nome de contacto"
                    required
                    autoComplete="name"
                    error={fieldError("contact_name")}
                  />
                  <Field
                    id="contact_email"
                    label="Email"
                    required
                    type="email"
                    autoComplete="email"
                    error={fieldError("contact_email")}
                  />
                  <Field
                    id="telefone"
                    label="Telefone"
                    type="tel"
                    autoComplete="tel"
                    validated={false}
                  />
                  <label className={styles.field} htmlFor="message">
                    <span>Mensagem</span>
                    <textarea id="message" name="message" rows={4} />
                  </label>
                </div>
              ) : (
                <>
                <div className={styles.card}>
                  <h2 className={styles.formTitle}>Dados da agência</h2>
                  <RequiredHint />
                  <Field
                    id="agency_name"
                    label="Nome da agência"
                    required
                    autoComplete="organization"
                    error={fieldError("agency_name")}
                  />
                  <Field
                    id="agency_code"
                    label="Código da agência"
                    placeholder="ex.: minha-agencia"
                    hint="Apenas letras, números, hífen (-) e underscore (_)."
                    error={fieldError("agency_code")}
                  />
                  <Field
                    id="email"
                    label="Email geral da agência"
                    type="email"
                    autoComplete="email"
                    error={fieldError("email")}
                  />
                  <Field
                    id="telefone"
                    label="Telefone"
                    type="tel"
                    autoComplete="tel"
                    validated={false}
                  />
                </div>

                <div className={styles.card}>
                  <h2 className={styles.formTitle}>Administrador</h2>
                  <Field
                    id="admin_name"
                    label="Nome completo"
                    required
                    autoComplete="name"
                    error={fieldError("admin_name")}
                  />
                  <Field
                    id="admin_email"
                    label="Email"
                    required
                    type="email"
                    autoComplete="email"
                    error={fieldError("admin_email")}
                  />
                </div>
                </>
              )}

              <button type="submit" className={styles.submit}>
                Enviar pedido por email
              </button>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import {
  CONTACT_EMAIL,
  DURACAO_LABELS,
  formatPlanoPrice,
  SALES_EMAIL,
  type DuracaoSubscricao,
  type Plano,
} from "@/lib/site-data";
import styles from "./aderir.module.css";

type AderirContentProps = {
  planos: Plano[];
  initialPlanoSlug: string | null;
};

type FieldError = { id: string; message: string };

function buildMailto(to: string, subject: string, body: string): string {
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function AderirContent({ planos, initialPlanoSlug }: AderirContentProps) {
  const defaultSlug =
    initialPlanoSlug && planos.some((p) => p.slug === initialPlanoSlug)
      ? initialPlanoSlug
      : planos.find((p) => !p.requires_sales_contact)?.slug ?? planos[0]?.slug ?? "";

  const [selectedSlug, setSelectedSlug] = useState(defaultSlug);
  const [duracao, setDuracao] = useState<DuracaoSubscricao>("mensal");
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [successMailto, setSuccessMailto] = useState<string | null>(null);
  const errorSummaryRef = useRef<HTMLDivElement | null>(null);

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

    const agencyName = String(data.get("agency_name") ?? "").trim();
    if (!agencyName) {
      next.push({ id: "agency_name", message: "Indique o nome da agência." });
    }

    if (isEnterprise) {
      const contactName = String(data.get("contact_name") ?? "").trim();
      const contactEmail = String(data.get("contact_email") ?? "").trim();

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
      const agencyCode = String(data.get("agency_code") ?? "").trim();
      const agencyEmail = String(data.get("email") ?? "").trim();
      const adminName = String(data.get("admin_name") ?? "").trim();
      const adminEmail = String(data.get("admin_email") ?? "").trim();

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
    setSubmitting(true);

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
    setSubmitting(false);

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
              src="/brand/logo-mark.png"
              alt="TravelPlus"
              width={140}
              height={56}
              className={styles.logoImg}
              priority
            />
          </Link>
          <Link href="/" className={styles.backLink}>
            ← Voltar ao site
          </Link>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.intro}>
          <h1 className={styles.title}>Aderir ao TravelPlus</h1>
          <p className={styles.lead}>
            Escolha o plano e envie o pedido. Vamos abrir o seu cliente de email
            com os dados pré-preenchidos. Se preferir, pode copiar o pedido e
            enviar manualmente para a nossa equipa.
          </p>
        </div>

        <div className={styles.layout}>
          <aside className={styles.planPicker}>
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

            {selectedPlano && !isEnterprise ? (
              <div className={styles.duracaoBlock}>
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
                {selectedPrice !== null ? (
                  <p className={styles.priceSummary}>
                    Total: <strong>{formatPlanoPrice(selectedPrice)}</strong> (
                    {DURACAO_LABELS[duracao].toLowerCase()})
                  </p>
                ) : null}
              </div>
            ) : null}

            {selectedPlano ? (
              <ul className={styles.highlights}>
                {selectedPlano.feature_highlights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </aside>

          <section className={styles.formPanel}>
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
                <>
                  <h2 className={styles.formTitle}>Pedido Enterprise</h2>
                  <p className={styles.formHint}>
                    Preencha os dados. Ao enviar, abrimos o seu cliente de email
                    com o pedido pré-preenchido para {SALES_EMAIL}.
                  </p>
                  <label className={styles.field} htmlFor="agency_name">
                    <span>Nome da agência</span>
                    <input
                      id="agency_name"
                      name="agency_name"
                      required
                      autoComplete="organization"
                      aria-invalid={Boolean(fieldError("agency_name"))}
                      aria-describedby={
                        fieldError("agency_name")
                          ? "agency_name-error"
                          : undefined
                      }
                    />
                    {fieldError("agency_name") ? (
                      <em id="agency_name-error">{fieldError("agency_name")}</em>
                    ) : null}
                  </label>
                  <label className={styles.field} htmlFor="contact_name">
                    <span>Nome de contacto</span>
                    <input
                      id="contact_name"
                      name="contact_name"
                      required
                      autoComplete="name"
                      aria-invalid={Boolean(fieldError("contact_name"))}
                      aria-describedby={
                        fieldError("contact_name")
                          ? "contact_name-error"
                          : undefined
                      }
                    />
                    {fieldError("contact_name") ? (
                      <em id="contact_name-error">
                        {fieldError("contact_name")}
                      </em>
                    ) : null}
                  </label>
                  <label className={styles.field} htmlFor="contact_email">
                    <span>Email</span>
                    <input
                      id="contact_email"
                      name="contact_email"
                      type="email"
                      required
                      autoComplete="email"
                      aria-invalid={Boolean(fieldError("contact_email"))}
                      aria-describedby={
                        fieldError("contact_email")
                          ? "contact_email-error"
                          : undefined
                      }
                    />
                    {fieldError("contact_email") ? (
                      <em id="contact_email-error">
                        {fieldError("contact_email")}
                      </em>
                    ) : null}
                  </label>
                  <label className={styles.field} htmlFor="telefone">
                    <span>Telefone (opcional)</span>
                    <input
                      id="telefone"
                      name="telefone"
                      type="tel"
                      autoComplete="tel"
                    />
                  </label>
                  <label className={styles.field} htmlFor="message">
                    <span>Mensagem (opcional)</span>
                    <textarea id="message" name="message" rows={4} />
                  </label>
                </>
              ) : (
                <>
                  <h2 className={styles.formTitle}>Dados da agência</h2>
                  <p className={styles.formHint}>
                    Preencha os dados. Ao enviar, abrimos o seu cliente de email
                    com o pedido pré-preenchido para {CONTACT_EMAIL}.
                  </p>
                  <label className={styles.field} htmlFor="agency_name">
                    <span>Nome da agência</span>
                    <input
                      id="agency_name"
                      name="agency_name"
                      required
                      autoComplete="organization"
                      aria-invalid={Boolean(fieldError("agency_name"))}
                      aria-describedby={
                        fieldError("agency_name")
                          ? "agency_name-error"
                          : undefined
                      }
                    />
                    {fieldError("agency_name") ? (
                      <em id="agency_name-error">{fieldError("agency_name")}</em>
                    ) : null}
                  </label>
                  <label className={styles.field} htmlFor="agency_code">
                    <span>Código da agência (opcional)</span>
                    <input
                      id="agency_code"
                      name="agency_code"
                      placeholder="ex.: minha-agencia"
                      aria-invalid={Boolean(fieldError("agency_code"))}
                      aria-describedby={
                        fieldError("agency_code")
                          ? "agency_code-error"
                          : "agency_code-hint"
                      }
                    />
                    <span id="agency_code-hint" className={styles.fieldHint}>
                      Apenas letras, números, hífen (-) e underscore (_).
                    </span>
                    {fieldError("agency_code") ? (
                      <em id="agency_code-error">{fieldError("agency_code")}</em>
                    ) : null}
                  </label>
                  <label className={styles.field} htmlFor="email">
                    <span>Email geral da agência (opcional)</span>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      aria-invalid={Boolean(fieldError("email"))}
                      aria-describedby={
                        fieldError("email") ? "email-error" : undefined
                      }
                    />
                    {fieldError("email") ? (
                      <em id="email-error">{fieldError("email")}</em>
                    ) : null}
                  </label>
                  <label className={styles.field} htmlFor="telefone">
                    <span>Telefone (opcional)</span>
                    <input
                      id="telefone"
                      name="telefone"
                      type="tel"
                      autoComplete="tel"
                    />
                  </label>

                  <h2 className={styles.formTitle}>Administrador</h2>
                  <label className={styles.field} htmlFor="admin_name">
                    <span>Nome completo</span>
                    <input
                      id="admin_name"
                      name="admin_name"
                      required
                      autoComplete="name"
                      aria-invalid={Boolean(fieldError("admin_name"))}
                      aria-describedby={
                        fieldError("admin_name")
                          ? "admin_name-error"
                          : undefined
                      }
                    />
                    {fieldError("admin_name") ? (
                      <em id="admin_name-error">{fieldError("admin_name")}</em>
                    ) : null}
                  </label>
                  <label className={styles.field} htmlFor="admin_email">
                    <span>Email</span>
                    <input
                      id="admin_email"
                      name="admin_email"
                      type="email"
                      required
                      autoComplete="email"
                      aria-invalid={Boolean(fieldError("admin_email"))}
                      aria-describedby={
                        fieldError("admin_email")
                          ? "admin_email-error"
                          : undefined
                      }
                    />
                    {fieldError("admin_email") ? (
                      <em id="admin_email-error">{fieldError("admin_email")}</em>
                    ) : null}
                  </label>
                </>
              )}

              <button
                type="submit"
                className={styles.submit}
                disabled={submitting}
              >
                {submitting
                  ? "A preparar pedido…"
                  : "Enviar pedido por email"}
              </button>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}

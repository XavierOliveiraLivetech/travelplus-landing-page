"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { returnHref } from "@/lib/returnSection";
import {
  SALES_EMAIL,
  type DuracaoSubscricao,
  type Plano,
} from "@/lib/site-data";
import styles from "./aderir.module.css";
import { assetPath } from "@/lib/assetPath";
import { AdesaoWizard } from "./AdesaoWizard";

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
    planos.find((p) => p.highlighted && !p.requires_sales_contact)?.slug ??
    planos.find((p) => !p.requires_sales_contact)?.slug ??
    planos[0]?.slug ??
    "";

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
  // Enterprise leaves the slides for the sales-contact form.
  const [enterpriseOpen, setEnterpriseOpen] = useState(false);
  const errorSummaryRef = useRef<HTMLDivElement | null>(null);
  // "Voltar ao site" returns to the section the visitor came from.
  const [backHref, setBackHref] = useState("/");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage is only readable after hydration
    setBackHref(returnHref());
  }, []);

  function handleSelectPlano(slug: string) {
    setSelectedSlug(slug);
    // Keep the chosen duration only if the new plan sells it.
    const plano = planos.find((p) => p.slug === slug);
    if (plano && plano.precos[duracao] === null) setDuracao("mensal");
  }

  function validate(form: HTMLFormElement): FieldError[] {
    const data = new FormData(form);
    const next: FieldError[] = [];

    const agencyName = readText(data, "agency_name");
    if (!agencyName) {
      next.push({ id: "agency_name", message: "Indique o nome da agência." });
    }

    const contactName = readText(data, "contact_name");
    const contactEmail = readText(data, "contact_email");

    if (!contactName) {
      next.push({ id: "contact_name", message: "Indique o nome de contacto." });
    }
    if (!contactEmail) {
      next.push({ id: "contact_email", message: "Indique o email de contacto." });
    } else if (!isValidEmail(contactEmail)) {
      next.push({
        id: "contact_email",
        message: "Indique um email de contacto válido.",
      });
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

    const mailto = buildMailto(
      SALES_EMAIL,
      `TravelPlus Enterprise — ${formData.get("agency_name") ?? ""}`,
      body,
    );

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
        {enterpriseOpen ? (
          <div className={styles.flow}>
            {/* The wizard carries its own h1 in its rail; this view needs one too. */}
            <div className={styles.intro}>
              <h1 className={styles.title}>Pedido Enterprise</h1>
              <p className={styles.lead}>
                Conte-nos o que a agência precisa e a equipa comercial responde por email.
              </p>
            </div>
            {successMailto ? (
              <div className={styles.success} role="status">
                <p>
                  Pedido preparado. Se o cliente de email não abriu, use o link
                  abaixo para enviar manualmente.
                </p>
                <p>
                  <a href={successMailto}>Abrir pedido por email</a>
                  {" · "}
                  Destino: {SALES_EMAIL}
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

              <div className={styles.card}>
                <button
                  type="button"
                  className={styles.backButton}
                  onClick={() => {
                    setEnterpriseOpen(false);
                    setErrors([]);
                    setSuccessMailto(null);
                  }}
                >
                  ← Escolher outro plano
                </button>
                <h2 className={styles.formTitle}>Dados de contacto</h2>
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
              <button type="submit" className={styles.submit}>
                Enviar pedido por email
              </button>
            </form>
          </div>
        ) : (
          <AdesaoWizard
            planos={planos}
            selectedSlug={selectedSlug}
            onSelectPlano={handleSelectPlano}
            duracao={duracao}
            onDuracaoChange={setDuracao}
            onEnterprise={() => setEnterpriseOpen(true)}
          />
        )}
      </main>
    </div>
  );
}

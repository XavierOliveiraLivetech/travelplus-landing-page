"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
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

function buildMailto(to: string, subject: string, body: string): string {
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function AderirContent({ planos, initialPlanoSlug }: AderirContentProps) {
  const defaultSlug =
    initialPlanoSlug && planos.some((p) => p.slug === initialPlanoSlug)
      ? initialPlanoSlug
      : planos.find((p) => !p.requires_sales_contact)?.slug ?? planos[0]?.slug ?? "";

  const [selectedSlug, setSelectedSlug] = useState(defaultSlug);
  const [duracao, setDuracao] = useState<DuracaoSubscricao>("mensal");

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

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

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

      window.location.href = buildMailto(
        SALES_EMAIL,
        `TravelPlus Enterprise — ${formData.get("agency_name") ?? ""}`,
        body,
      );
      return;
    }

    const price = selectedPrice !== null ? formatPlanoPrice(selectedPrice) : "—";
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

    window.location.href = buildMailto(
      CONTACT_EMAIL,
      `Aderir ao TravelPlus — ${formData.get("agency_name") ?? ""}`,
      body,
    );
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
            Escolhe o plano e envia o pedido por email. Para soluções Enterprise,
            contacta a nossa equipa comercial.
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
                      className={active ? styles.planOptionActive : styles.planOption}
                      onClick={() => setSelectedSlug(plano.slug)}
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
            <form className={styles.form} onSubmit={handleSubmit} noValidate>
              {isEnterprise ? (
                <>
                  <h2 className={styles.formTitle}>Pedido Enterprise</h2>
                  <p className={styles.formHint}>
                    Preenche os dados e abre o teu cliente de email com o pedido
                    pré-preenchido para {SALES_EMAIL}.
                  </p>
                  <label className={styles.field}>
                    <span>Nome da agência</span>
                    <input name="agency_name" required autoComplete="organization" />
                  </label>
                  <label className={styles.field}>
                    <span>Nome de contacto</span>
                    <input name="contact_name" required autoComplete="name" />
                  </label>
                  <label className={styles.field}>
                    <span>Email</span>
                    <input
                      name="contact_email"
                      type="email"
                      required
                      autoComplete="email"
                    />
                  </label>
                  <label className={styles.field}>
                    <span>Telefone (opcional)</span>
                    <input name="telefone" type="tel" autoComplete="tel" />
                  </label>
                  <label className={styles.field}>
                    <span>Mensagem (opcional)</span>
                    <textarea name="message" rows={4} />
                  </label>
                </>
              ) : (
                <>
                  <h2 className={styles.formTitle}>Dados da agência</h2>
                  <p className={styles.formHint}>
                    Preenche os dados e envia o pedido por email para{" "}
                    {CONTACT_EMAIL}.
                  </p>
                  <label className={styles.field}>
                    <span>Nome da agência</span>
                    <input name="agency_name" required autoComplete="organization" />
                  </label>
                  <label className={styles.field}>
                    <span>Código da agência (opcional)</span>
                    <input
                      name="agency_code"
                      placeholder="ex.: minha-agencia"
                      pattern="[A-Za-z0-9_-]+"
                    />
                  </label>
                  <label className={styles.field}>
                    <span>Email geral da agência (opcional)</span>
                    <input name="email" type="email" autoComplete="email" />
                  </label>
                  <label className={styles.field}>
                    <span>Telefone (opcional)</span>
                    <input name="telefone" type="tel" autoComplete="tel" />
                  </label>

                  <h2 className={styles.formTitle}>Administrador</h2>
                  <label className={styles.field}>
                    <span>Nome completo</span>
                    <input name="admin_name" required autoComplete="name" />
                  </label>
                  <label className={styles.field}>
                    <span>Email</span>
                    <input
                      name="admin_email"
                      type="email"
                      required
                      autoComplete="email"
                    />
                  </label>
                </>
              )}

              <button type="submit" className={styles.submit}>
                {isEnterprise ? "Enviar pedido por email" : "Enviar pedido por email"}
              </button>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}

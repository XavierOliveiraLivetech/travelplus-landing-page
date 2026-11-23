"use client";

import Link from "next/link";
import { useState } from "react";
import { FaCheck } from "react-icons/fa6";
import {
  DURACAO_LABELS,
  DURACAO_PERIOD_SUFFIX,
  PLANOS,
  PRICING_SECTION,
  formatPlanoPrice,
  type DuracaoSubscricao,
  type Plano,
} from "@/lib/site-data";
import styles from "@/app/site.module.css";

function PricingCard({
  plano,
  duracao,
  index,
}: {
  plano: Plano;
  duracao: DuracaoSubscricao;
  index: number;
}) {
  const isEnterprise = plano.requires_sales_contact;
  const price = isEnterprise ? null : plano.precos[duracao];
  const featured = Boolean(plano.highlighted);

  return (
    <li
      className={
        featured ? styles.pricingTicketFeatured : styles.pricingTicket
      }
      data-pricing-item
      data-reveal
      data-flight-index={index}
    >
      {featured ? (
        <p className={styles.pricingTicketTab}>Popular</p>
      ) : null}

      <div className={styles.pricingTicketBody}>
        <div className={styles.pricingTicketTop}>
          <h3 className={styles.pricingName}>{plano.nome}</h3>
          <p className={styles.pricingDesc}>{plano.descricao}</p>
          <p className={styles.pricingPrice}>
            {isEnterprise || price === null ? (
              <span className={styles.pricingAmount}>Sob consulta</span>
            ) : (
              <>
                <span className={styles.pricingAmount}>
                  {formatPlanoPrice(price)}
                </span>
                <span className={styles.pricingPeriod}>
                  {DURACAO_PERIOD_SUFFIX[duracao]}
                </span>
              </>
            )}
          </p>
        </div>

        <div className={styles.pricingTicketPerforation} aria-hidden="true" />

        <div className={styles.pricingTicketBottom}>
          <ul className={styles.pricingFeatures}>
            {plano.feature_highlights.map((item) => (
              <li key={item} className={styles.pricingFeatureItem}>
                <FaCheck
                  className={styles.pricingFeatureIcon}
                  aria-hidden="true"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          {isEnterprise ? (
            <Link
              href="/aderir?plano=enterprise"
              className={styles.pricingButtonSecondary}
            >
              Falar com comercial
            </Link>
          ) : (
            <Link
              href={`/aderir?plano=${encodeURIComponent(plano.slug)}`}
              className={
                featured
                  ? styles.pricingButtonPrimary
                  : styles.pricingButton
              }
            >
              {`Aderir ao ${plano.nome}`}
            </Link>
          )}
        </div>
      </div>
    </li>
  );
}

export function PricingSection() {
  const [duracao, setDuracao] = useState<DuracaoSubscricao>("mensal");

  return (
    <section
      id="planos"
      className={styles.pricing}
      data-story-section="pricing"
    >
      <div className={styles.sectionInner}>
        <h2 className={styles.sectionTitle} data-pricing-shell data-reveal data-flight-index={0}>
          {PRICING_SECTION.title}
        </h2>
        <p className={styles.sectionLead} data-pricing-shell data-reveal data-flight-index={1}>
          {PRICING_SECTION.lead}
        </p>

        <div
          className={styles.pricingDuration}
          role="group"
          aria-label="Duração da subscrição"
          data-pricing-shell
          data-reveal
          data-flight-index={2}
        >
          {(Object.keys(DURACAO_LABELS) as DuracaoSubscricao[]).map((key) => (
            <button
              key={key}
              type="button"
              className={
                duracao === key
                  ? styles.pricingDurationActive
                  : styles.pricingDurationBtn
              }
              aria-pressed={duracao === key}
              onClick={() => setDuracao(key)}
            >
              {DURACAO_LABELS[key]}
            </button>
          ))}
        </div>

        <ul className={styles.pricingGrid} data-pricing-grid>
          {PLANOS.map((plano, index) => (
            <PricingCard
              key={plano.slug}
              plano={plano}
              duracao={duracao}
              index={index + 3}
            />
          ))}
        </ul>
      </div>
    </section>
  );
}

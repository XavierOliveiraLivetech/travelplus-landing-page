import Image from "next/image";
import Link from "next/link";
import {
  CONTACT_EMAIL,
  CTA,
  FEATURES,
  HERO,
  PLANOS,
  PRICING_SECTION,
  PROBLEM,
  PROOF,
  STEPS,
  formatPlanoPrice,
  type Plano,
} from "@/lib/site-data";
import styles from "./site.module.css";

function PricingCard({ plano }: { plano: Plano }) {
  const isEnterprise = plano.requires_sales_contact;
  const monthly = plano.precos.mensal;

  return (
    <li
      className={
        plano.highlighted ? styles.pricingCardFeatured : styles.pricingCard
      }
    >
      {plano.highlighted ? (
        <p className={styles.pricingBadge}>Mais escolhido</p>
      ) : null}
      <h3 className={styles.pricingName}>{plano.nome}</h3>
      <p className={styles.pricingDesc}>{plano.descricao}</p>
      <p className={styles.pricingPrice}>
        {isEnterprise ? (
          <span className={styles.pricingAmount}>Sob consulta</span>
        ) : (
          <>
            <span className={styles.pricingAmount}>
              {formatPlanoPrice(monthly)}
            </span>
            <span className={styles.pricingPeriod}>/ mês</span>
          </>
        )}
      </p>
      <ul className={styles.pricingFeatures}>
        {plano.feature_highlights.map((item) => (
          <li key={item}>{item}</li>
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
            plano.highlighted
              ? styles.pricingButtonPrimary
              : styles.pricingButton
          }
        >
          Aderir
        </Link>
      )}
    </li>
  );
}

export function SiteContent() {
  const contactHref = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Contacto TravelPlus")}`;

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
          <nav className={styles.nav} aria-label="Principal">
            <a href="#produto" className={styles.navLink}>
              Produto
            </a>
            <a href="#como-funciona" className={styles.navLink}>
              Como funciona
            </a>
            <a href="#planos" className={styles.navLink}>
              Planos
            </a>
          </nav>
          <Link href="/aderir" className={styles.headerCta}>
            Pedir adesão
          </Link>
        </div>
      </header>

      <main>
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroMedia} aria-hidden="true">
            <Image
              src="https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=2000&q=80"
              alt=""
              fill
              priority
              className={styles.heroPhoto}
              sizes="100vw"
            />
            <div className={styles.heroTint} />
          </div>

          <div className={styles.heroInner}>
            <Image
              src="/brand/logo-on-dark.png"
              alt="TravelPlus"
              width={220}
              height={88}
              className={styles.heroBrand}
              priority
            />
            <h1 id="hero-title" className={styles.heroTitle}>
              {HERO.title}
            </h1>
            <p className={styles.heroLead}>{HERO.lead}</p>
            <div className={styles.heroActions}>
              <Link href="/aderir" className={styles.primaryButton}>
                Começar agora
              </Link>
              <a href="#planos" className={styles.secondaryButton}>
                Ver planos
              </a>
            </div>
          </div>
        </section>

        <section className={styles.proof} aria-label="Destaques">
          <ul className={styles.proofList}>
            {PROOF.map((item) => (
              <li key={item.value} className={styles.proofItem}>
                <span className={styles.proofValue}>{item.value}</span>
                <span className={styles.proofLabel}>{item.label}</span>
              </li>
            ))}
          </ul>
        </section>

        <section id="produto" className={styles.problem}>
          <div className={styles.sectionInner}>
            <div className={styles.problemCopy}>
              <h2 className={styles.sectionTitle}>{PROBLEM.title}</h2>
              <p className={styles.sectionLead}>{PROBLEM.lead}</p>
            </div>
            <div className={styles.productMock} aria-hidden="true">
              <div className={styles.mockBar}>
                <span />
                <span />
                <span />
              </div>
              <div className={styles.mockBody}>
                <p className={styles.mockLabel}>Pesquisa de pacotes</p>
                <div className={styles.mockFields}>
                  <span>Lisboa → Faro</span>
                  <span>12 – 19 Out</span>
                  <span>2 adultos</span>
                </div>
                <div className={styles.mockResults}>
                  <div className={styles.mockRow}>
                    <strong>Algarve · 7 noites</strong>
                    <span>a partir de 489 €</span>
                  </div>
                  <div className={styles.mockRow}>
                    <strong>Madeira · voo + hotel</strong>
                    <span>a partir de 612 €</span>
                  </div>
                  <div className={styles.mockRow}>
                    <strong>Paris · city break</strong>
                    <span>a partir de 354 €</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.features} aria-labelledby="features-title">
          <div className={styles.sectionInner}>
            <h2 id="features-title" className={styles.sectionTitle}>
              Tudo o que a agência precisa num só sítio
            </h2>
            <p className={styles.sectionLead}>
              Do primeiro contacto com o cliente até à reserva confirmada —
              sem mudar de ferramenta a meio do processo.
            </p>
            <ul className={styles.featureList}>
              {FEATURES.map((feature, index) => (
                <li
                  key={feature.title}
                  className={styles.featureItem}
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  <span className={styles.featureIndex}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className={styles.featureTitle}>{feature.title}</h3>
                    <p className={styles.featureBody}>{feature.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="como-funciona" className={styles.steps}>
          <div className={styles.sectionInner}>
            <h2 className={styles.sectionTitle}>Como funciona</h2>
            <p className={styles.sectionLead}>
              Três passos simples para ter a plataforma a trabalhar pela sua
              equipa.
            </p>
            <ol className={styles.stepList}>
              {STEPS.map((item) => (
                <li key={item.step} className={styles.stepItem}>
                  <span className={styles.stepNumber}>{item.step}</span>
                  <h3 className={styles.stepTitle}>{item.title}</h3>
                  <p className={styles.stepBody}>{item.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="planos" className={styles.pricing}>
          <div className={styles.sectionInner}>
            <h2 className={styles.sectionTitle}>{PRICING_SECTION.title}</h2>
            <p className={styles.sectionLead}>{PRICING_SECTION.lead}</p>
            <ul className={styles.pricingGrid}>
              {PLANOS.map((plano) => (
                <PricingCard key={plano.slug} plano={plano} />
              ))}
            </ul>
          </div>
        </section>

        <section id="contacto" className={styles.cta}>
          <div className={styles.ctaInner}>
            <Image
              src="/brand/logo-on-dark.png"
              alt=""
              width={160}
              height={64}
              className={styles.ctaLogo}
            />
            <h2 className={styles.ctaTitle}>{CTA.title}</h2>
            <p className={styles.ctaLead}>{CTA.lead}</p>
            <div className={styles.ctaActions}>
              <Link href="/aderir" className={styles.primaryButton}>
                Escolher plano
              </Link>
              <a href={contactHref} className={styles.ghostButton}>
                {CONTACT_EMAIL}
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <Image
              src="/brand/logo-mark.png"
              alt="TravelPlus"
              width={120}
              height={48}
              className={styles.footerLogo}
            />
            <p className={styles.footerNote}>
              Software SaaS para agências de viagens · Portugal
            </p>
          </div>
          <div className={styles.footerMeta}>
            <p>
              <a href={contactHref}>{CONTACT_EMAIL}</a>
            </p>
            <p className={styles.footerFine}>
              © {new Date().getFullYear()} TravelPlus · Livetech
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

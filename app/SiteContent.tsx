import { FeaturesDial } from "@/components/FeaturesDial";
import { PricingSection } from "@/components/PricingSection";
import { SectionNavButtons } from "@/components/SectionNavButtons";
import { SectionSnap } from "@/components/SectionSnap";
import { SiteHeader } from "@/components/SiteHeader";
import { StepsJourney } from "@/components/StepsJourney";
import Image from "next/image";
import Link from "next/link";
import { CONTACT_EMAIL, CTA, HERO, PROBLEM, PROOF } from "@/lib/site-data";
import styles from "./site.module.css";

export function SiteContent() {
  const contactHref = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Contacto TravelPlus")}`;

  return (
    <div className={styles.page}>
      <a href="#conteudo-principal" className={styles.skipLink}>
        Saltar para o conteúdo
      </a>
      <SectionSnap />
      <SectionNavButtons />
      <SiteHeader />

      <main id="conteudo-principal">
        <section
          className={styles.heroBlock}
          aria-labelledby="hero-title"
          data-snap-section
          data-snap-id="inicio"
        >
          <div className={styles.hero}>
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
          </div>

          <div className={styles.proof} aria-label="Destaques">
            <ul className={styles.proofList}>
              {PROOF.map((item) => (
                <li key={item.value} className={styles.proofItem}>
                  <span className={styles.proofValue}>{item.value}</span>
                  <span className={styles.proofLabel}>{item.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          id="produto"
          className={styles.problem}
          data-snap-section
          data-snap-id="produto"
        >
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

        <FeaturesDial />

        <StepsJourney />

        <PricingSection />

        <section
          id="contacto"
          className={styles.ctaBlock}
          data-snap-section
          data-snap-id="contacto"
        >
          <div className={styles.cta}>
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
          </div>

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
        </section>
      </main>
    </div>
  );
}

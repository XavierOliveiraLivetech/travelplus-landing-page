import { FeaturesDial } from "@/components/FeaturesDial";
import { HeroHighlights } from "@/components/HeroHighlights";
import { PlatformFlow } from "@/components/PlatformFlow";
import { PricingSection } from "@/components/PricingSection";
import { ReturnSectionTracker } from "@/components/ReturnSectionTracker";
import { ScrollReveal } from "@/components/ScrollReveal";
import { SiteHeader } from "@/components/SiteHeader";
import { StepsJourney } from "@/components/StepsJourney";
import { ToolsMerge } from "@/components/ToolsMerge";
import Image from "next/image";
import Link from "next/link";
import { CTA, HERO, PROBLEM } from "@/lib/site-data";
import styles from "./site.module.css";
import { assetPath } from "@/lib/assetPath";

export function SiteContent() {
  return (
    <div className={styles.page}>
      <a href="#conteudo-principal" className={styles.skipLink}>
        Saltar para o conteúdo
      </a>
      <ScrollReveal />
      <ReturnSectionTracker />
      <SiteHeader />

      <main id="conteudo-principal">
        <section id="inicio" className={styles.heroBlock} aria-labelledby="hero-title">
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
              <div className={styles.heroCopy}>
                <h1 id="hero-title" className={styles.heroTitle}>
                  {HERO.title}
                </h1>
                <p className={styles.heroLead}>{HERO.lead}</p>
                <div className={styles.heroActions}>
                  <Link href="/aderir" className={styles.primaryButton}>
                    Aderir
                  </Link>
                  <a href="#planos" className={styles.secondaryButton}>
                    Ver planos
                  </a>
                </div>
              </div>

              <HeroHighlights />
            </div>
          </div>
        </section>

        <section id="produto" className={styles.problem} aria-labelledby="problem-title">
          <div className={styles.sectionInner}>
            <div className={styles.problemCopy} data-reveal>
              <h2 id="problem-title" className={styles.sectionTitle}>
                {PROBLEM.title}
              </h2>
              <p className={styles.sectionLead}>{PROBLEM.lead}</p>
            </div>
            <ToolsMerge />
          </div>
        </section>

        <FeaturesDial />
        <StepsJourney />
        <PricingSection />

        <section id="contacto" className={styles.ctaBlock}>
          <div className={styles.cta}>
            <div className={styles.ctaInner}>
              <div className={styles.ctaCopy} data-reveal>
                <h2 className={styles.ctaTitle}>{CTA.title}</h2>
                <p className={styles.ctaLead}>{CTA.lead}</p>
                <div className={styles.ctaActions}>
                  <Link href="/aderir" className={styles.primaryButton}>
                    Escolher plano
                  </Link>
                </div>
              </div>
              <div className={styles.ctaVisual} data-reveal>
                <PlatformFlow />
              </div>
            </div>
          </div>

          <footer className={styles.footer}>
            <div className={styles.footerInner}>
              <div className={styles.footerTop}>
                <div className={styles.footerBrand}>
                  <Image
                    src={assetPath("/brand/logo-mark.png")}
                    alt="TravelPlus"
                    width={120}
                    height={48}
                    className={styles.footerLogo}
                  />
                </div>

                <nav className={styles.footerNav} aria-label="Rodapé">
                  <ul className={styles.footerList}>
                    <li>
                      <a href="#produto">Produto</a>
                    </li>
                    <li>
                      <a href="#como-funciona">Como funciona</a>
                    </li>
                    <li>
                      <a href="#planos">Planos</a>
                    </li>
                  </ul>
                </nav>

                <div className={styles.footerCta}>
                  <Link
                    href="/aderir"
                    className={`${styles.primaryButton} ${styles.footerCtaButton}`}
                  >
                    Aderir
                    <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </div>

              <div className={styles.footerBottom}>
                <p>© {new Date().getFullYear()} TravelPlus. Todos os direitos reservados.</p>
              </div>
            </div>
          </footer>
        </section>
      </main>
    </div>
  );
}

import { FeaturesDial } from "@/components/FeaturesDial";
import { HeroHighlights } from "@/components/HeroHighlights";
import { PaperPlaneFlight } from "@/components/PaperPlaneFlight";
import { PlatformFlow } from "@/components/PlatformFlow";
import { PricingSection } from "@/components/PricingSection";
import { ReturnSectionTracker } from "@/components/ReturnSectionTracker";
import { ScrollReveal } from "@/components/ScrollReveal";
import { SectionNavButtons } from "@/components/SectionNavButtons";
import { SectionSnap } from "@/components/SectionSnap";
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
      <SectionSnap />
      <ScrollReveal />
      <ReturnSectionTracker />
      <SectionNavButtons />
      <SiteHeader />

      <main id="conteudo-principal">
        <PaperPlaneFlight>
          <section
            id="inicio"
            className={styles.heroBlock}
            aria-labelledby="hero-title"
            data-story-section="hero"
          >
            <div className={styles.hero}>
              <div
                className={styles.heroMedia}
                aria-hidden="true"
                data-story-layer="hero-bg"
              >
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
                <h1
                  id="hero-title"
                  className={styles.heroTitle}
                  data-story-layer="hero-title"
                >
                  {HERO.title}
                </h1>
                <p className={styles.heroLead} data-story-layer="hero-copy">
                  {HERO.lead}
                </p>
                <div
                  className={styles.heroActions}
                  data-story-layer="hero-actions"
                >
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

          <section
            id="produto"
            className={styles.problem}
            aria-labelledby="problem-title"
            data-story-section="problems"
          >
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

          <section
            id="contacto"
            className={styles.ctaBlock}
            data-story-section="closing"
          >
            <div className={styles.cta} data-story-layer="cta-bg">
              <div className={styles.ctaInner}>
                <div className={styles.ctaCopy} data-reveal>
                  <h2 className={styles.ctaTitle} data-story-layer="cta-title">
                    {CTA.title}
                  </h2>
                  <p className={styles.ctaLead} data-story-layer="cta-copy">
                    {CTA.lead}
                  </p>
                  <div
                    className={styles.ctaActions}
                    data-story-layer="cta-actions"
                  >
                    <Link href="/aderir" className={styles.primaryButton}>
                      Escolher plano
                    </Link>
                  </div>
                </div>
                <div
                  className={styles.ctaVisual}
                  data-story-layer="cta-copy"
                  data-reveal
                >
                  <PlatformFlow />
                </div>
              </div>
            </div>

            <footer className={styles.footer} data-story-layer="footer-bg">
              <div
                className={styles.footerInner}
                data-story-layer="footer-content"
              >
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
        </PaperPlaneFlight>
      </main>
    </div>
  );
}

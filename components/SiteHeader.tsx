"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { FaArrowRight } from "react-icons/fa6";
import styles from "@/app/site.module.css";
import { assetPath } from "@/lib/assetPath";
import type { CssVars } from "@/lib/cssVars";
import { cx } from "@/lib/cx";

const NAV_LINKS = [
  { href: "#produto", label: "Produto", hint: "Conheça a nossa plataforma" },
  { href: "#como-funciona", label: "Como funciona", hint: "Três passos até começar a vender" },
  { href: "#planos", label: "Planos", hint: "Os nossos planos" },
] as const;

/** Section currently under the header — used to mark the active menu row */
function findActiveHref(): string | null {
  const probe = window.innerHeight * 0.35;
  let active: string | null = null;
  for (const link of NAV_LINKS) {
    const el = document.querySelector<HTMLElement>(link.href);
    if (!el) continue;
    const rect = el.getBoundingClientRect();
    if (rect.top <= probe && rect.bottom > probe) active = link.href;
  }
  return active;
}

const HEADER_SOLID_OFFSET_PX = 72;

export function SiteHeader() {
  const menuId = useId();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeHref, setActiveHref] = useState<string | null>(null);
  /** Transparent over dark hero media until the hero title reaches the nav */
  const [overHero, setOverHero] = useState(true);

  useEffect(() => {
    const title = document.getElementById("hero-title");
    if (!title) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- no hero on the page: header is solid from the start
      setOverHero(false);
      return;
    }

    const syncFromTitle = () => {
      const top = title.getBoundingClientRect().top;
      // Transparent only while the title is still fully below the nav
      setOverHero(top > HEADER_SOLID_OFFSET_PX);
    };

    const observer = new IntersectionObserver(syncFromTitle, {
      rootMargin: `-${HEADER_SOLID_OFFSET_PX}px 0px 0px 0px`,
      threshold: [0, 0.01, 0.1, 0.25, 0.5, 1],
    });

    syncFromTitle();
    observer.observe(title);
    window.addEventListener("scroll", syncFromTitle, { passive: true });
    window.addEventListener("resize", syncFromTitle);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", syncFromTitle);
      window.removeEventListener("resize", syncFromTitle);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- active row is read from the page layout when the menu opens
    setActiveHref(findActiveHref());

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  // While the menu is open the header melts into the dark scrim
  const solid = !overHero && !menuOpen;

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <>
      <header
        data-site-header
        className={cx(styles.header, solid ? styles.headerSolid : styles.headerOnHero)}
      >
        <div className={styles.headerInner}>
          <Link href="/" className={styles.logoLink} aria-label="TravelPlus">
            <Image
              src={assetPath(solid ? "/brand/logo-mark.png" : "/brand/logo-on-dark.png")}
              alt="TravelPlus"
              width={140}
              height={56}
              className={styles.logoImg}
              priority
            />
          </Link>

          <nav className={styles.nav} aria-label="Principal">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className={styles.navLink}>
                {link.label}
              </a>
            ))}
          </nav>

          <Link href="/aderir" className={styles.headerCta}>
            Pedir adesão
          </Link>

          <button
            type="button"
            className={cx(styles.fabToggle, menuOpen && styles.fabToggleOpen)}
            aria-expanded={menuOpen}
            aria-controls={menuId}
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className={styles.fabGlyph} aria-hidden>
              <span className={styles.fabLid} />
              <span className={styles.fabBase} />
            </span>
          </button>
        </div>
      </header>

      <div
        className={cx(styles.fabRoot, menuOpen && styles.fabRootOpen)}
      >
        <button
          type="button"
          className={styles.fabBackdrop}
          tabIndex={menuOpen ? 0 : -1}
          aria-label="Fechar menu"
          aria-hidden={!menuOpen}
          onClick={closeMenu}
        />

        <nav
          id={menuId}
          className={styles.mnavSheet}
          aria-label="Principal móvel"
          aria-hidden={!menuOpen}
        >
          <ul className={styles.mnavList}>
            {NAV_LINKS.map((link, index) => {
              const isActive = activeHref === link.href;
              return (
                <li
                  key={link.href}
                  className={styles.mnavItem}
                  style={{ "--mnav-i": String(index) } as CssVars}
                >
                  <a
                    href={link.href}
                    className={cx(styles.mnavLink, isActive && styles.mnavLinkActive)}
                    aria-current={isActive ? "location" : undefined}
                    tabIndex={menuOpen ? 0 : -1}
                    onClick={closeMenu}
                  >
                    <span className={styles.mnavText}>
                      <span className={styles.mnavLabel}>{link.label}</span>
                      <span className={styles.mnavHint}>{link.hint}</span>
                    </span>
                    <span className={styles.mnavArrow} aria-hidden>
                      <FaArrowRight />
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>

          <div
            className={[styles.mnavItem, styles.mnavCta].join(" ")}
            style={{ "--mnav-i": String(NAV_LINKS.length) } as CssVars}
          >
            <Link
              href="/aderir"
              className={styles.mnavCtaButton}
              tabIndex={menuOpen ? 0 : -1}
              onClick={closeMenu}
            >
              Pedir adesão
              <FaArrowRight aria-hidden />
            </Link>
          </div>
        </nav>
      </div>
    </>
  );
}

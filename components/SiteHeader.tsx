"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { FaBoxesStacked, FaListOl, FaTags } from "react-icons/fa6";
import styles from "@/app/site.module.css";

const NAV_LINKS = [
  { href: "#produto", label: "Produto", Icon: FaBoxesStacked },
  { href: "#como-funciona", label: "Como funciona", Icon: FaListOl },
  { href: "#planos", label: "Planos", Icon: FaTags },
] as const;

const HEADER_SOLID_OFFSET_PX = 72;

export function SiteHeader() {
  const menuId = useId();
  const [menuOpen, setMenuOpen] = useState(false);
  /** Transparent over dark hero media until the hero title reaches the nav */
  const [overHero, setOverHero] = useState(true);

  useEffect(() => {
    const title = document.getElementById("hero-title");
    if (!title) {
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

    const onArrive = (event: Event) => {
      const id = (event as CustomEvent<{ id?: string }>).detail?.id;
      if (!id) return;
      if (id === "inicio") {
        syncFromTitle();
        return;
      }
      setOverHero(false);
    };

    syncFromTitle();
    observer.observe(title);
    window.addEventListener("scroll", syncFromTitle, { passive: true });
    window.addEventListener("resize", syncFromTitle);
    window.addEventListener("tp-section-arrive", onArrive);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", syncFromTitle);
      window.removeEventListener("resize", syncFromTitle);
      window.removeEventListener("tp-section-arrive", onArrive);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const solid = !overHero;

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <>
      <header
        className={[styles.header, solid ? styles.headerSolid : styles.headerOnHero]
          .filter(Boolean)
          .join(" ")}
      >
        <div className={styles.headerInner}>
          <Link href="/" className={styles.logoLink} aria-label="TravelPlus">
            <Image
              src={solid ? "/brand/logo-mark.png" : "/brand/logo-on-dark.png"}
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
            className={[styles.fabToggle, menuOpen ? styles.fabToggleOpen : ""]
              .filter(Boolean)
              .join(" ")}
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
        className={[styles.fabRoot, menuOpen ? styles.fabRootOpen : ""]
          .filter(Boolean)
          .join(" ")}
      >
        <button
          type="button"
          className={styles.fabBackdrop}
          tabIndex={menuOpen ? 0 : -1}
          aria-label="Fechar menu"
          aria-hidden={!menuOpen}
          onClick={closeMenu}
        />

        <div className={styles.fabCluster}>
          <nav
            id={menuId}
            className={styles.fabMenu}
            aria-label="Principal móvel"
            aria-hidden={!menuOpen}
          >
            <ul className={styles.fabList}>
              {NAV_LINKS.map((link, index) => {
                const Icon = link.Icon;
                return (
                  <li
                    key={link.href}
                    className={styles.fabItem}
                    style={
                      {
                        "--fab-i": String(index),
                      } as React.CSSProperties
                    }
                  >
                    <a
                      href={link.href}
                      className={styles.fabAction}
                      tabIndex={menuOpen ? 0 : -1}
                      onClick={closeMenu}
                    >
                      <span className={styles.fabLabel}>{link.label}</span>
                      <span className={styles.fabIconBtn} aria-hidden>
                        <Icon />
                      </span>
                    </a>
                  </li>
                );
              })}
              <li
                className={styles.fabItem}
                style={
                  {
                    "--fab-i": String(NAV_LINKS.length),
                  } as React.CSSProperties
                }
              >
                <Link
                  href="/aderir"
                  className={styles.headerCta}
                  tabIndex={menuOpen ? 0 : -1}
                  onClick={closeMenu}
                >
                  Pedir adesão
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </>
  );
}

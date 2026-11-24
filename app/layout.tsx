import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { HistorySlideTransition } from "@/components/HistorySlideTransition";

// Geist (same file as the Coming Soon page), self-hosted as a variable font.
const geist = localFont({
  src: "./fonts/Geist-VariableFont_wght.ttf",
  variable: "--font-geist",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "TravelPlus — Software para agências de viagens",
    template: "%s | TravelPlus",
  },
  description:
    "Plataforma SaaS portuguesa para agências: motor de pesquisa multi-operador, widget no site, orçamentos, reservas e gestão num só lugar.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // data-scroll-behavior: Next turns off the CSS smooth scroll while it
    // positions a new page, so page changes jump instead of gliding.
    <html
      lang="pt-PT"
      className={geist.variable}
      data-scroll-behavior="smooth"
    >
      {/* Browser extensions (e.g. ColorZilla's cz-shortcut-listen) add attributes
          to <body> before hydration; ignore those mismatches on this element only. */}
      <body suppressHydrationWarning>
        <HistorySlideTransition />
        {children}
      </body>
    </html>
  );
}

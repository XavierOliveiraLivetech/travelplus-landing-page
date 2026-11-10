import type { Metadata } from "next";
import { Outfit, Source_Sans_3 } from "next/font/google";
import "./globals.css";

const display = Outfit({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const body = Source_Sans_3({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
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
    <html lang="pt-PT" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}

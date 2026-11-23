import type { Metadata } from "next";
import { ViewTransition } from "react";
import { AderirContent } from "./AderirContent";
import { PLANOS } from "@/lib/site-data";

export const metadata: Metadata = {
  title: "Aderir ao TravelPlus",
  description: "Subscreve o TravelPlus ou pede contacto comercial para o plano Enterprise.",
};

export default function AderirPage() {
  // ?plano= is read in the browser (AderirContent) so the page can be exported statically.
  return (
    // Adesão enters from the right and leaves back to the right when returning home.
    <ViewTransition enter="page-slide-from-right" exit="page-slide-to-right" default="none">
      <AderirContent planos={PLANOS} />
    </ViewTransition>
  );
}

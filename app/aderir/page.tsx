import type { Metadata } from "next";
import { AderirContent } from "./AderirContent";
import { PLANOS } from "@/lib/site-data";

export const metadata: Metadata = {
  title: "Aderir ao TravelPlus",
  description: "Subscreve o TravelPlus ou pede contacto comercial para o plano Enterprise.",
};

type PageProps = {
  searchParams: Promise<{ plano?: string }>;
};

export default async function AderirPage({ searchParams }: PageProps) {
  const { plano: initialPlano } = await searchParams;

  return (
    <AderirContent
      planos={PLANOS}
      initialPlanoSlug={initialPlano?.trim() || null}
    />
  );
}

export const CONTACT_EMAIL = "info@livetech.pt";
export const SALES_EMAIL = "info@livetech.pt";

export function formatPlanoPrice(value: number | null): string {
  if (value === null) {
    return "—";
  }

  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export const HERO = {
  title: "O software que a sua agência precisa para vender mais viagens",
  lead: "Motor de pesquisa, orçamentos, reservas e gestão — pensado para agências portuguesas que querem trabalhar com mais rapidez e menos fricção.",
};

export const PROOF = [
  { value: "Multi-operador", label: "Pesquisa num só fluxo" },
  { value: "Widget próprio", label: "No site da sua agência" },
  { value: "Backoffice", label: "Equipas e operação" },
] as const;

export const PROBLEM = {
  title: "Menos ferramentas soltas. Mais controlo comercial.",
  lead: "Consultores perdem tempo a saltar entre sites de operadores, folhas de cálculo e emails. O TravelPlus concentra a pesquisa e a venda num fluxo único, com a sua marca à frente.",
};

export const FEATURES = [
  {
    title: "Motor multi-operador",
    body: "Compare pacotes de vários operadores no mesmo ecrã, com resultados claros para a equipa comercial.",
  },
  {
    title: "Widget no seu site",
    body: "Integre a pesquisa no site da agência, com domínio e identidade visual alinhados à sua marca.",
  },
  {
    title: "Orçamentos e reservas",
    body: "Do primeiro orçamento à confirmação — com área reservada para o cliente e ferramentas para o consultor.",
  },
  {
    title: "Gestão centralizada",
    body: "Backoffice para equipas, subscrições, sincronizações e o dia-a-dia da operação da agência.",
  },
  {
    title: "Área reservada do cliente",
    body: "O cliente acompanha propostas e reservas num espaço próprio — com a marca da agência à frente.",
  },
] as const;

export const STEPS = [
  {
    step: "01",
    title: "Escolha o plano",
    body: "Entry, Standard, Premium ou Enterprise — conforme o tamanho da equipa e o nível de branding.",
  },
  {
    step: "02",
    title: "Configure a agência",
    body: "Domínio, logo, utilizadores e operadores. Em pouco tempo a pesquisa está pronta a usar.",
  },
  {
    step: "03",
    title: "Venda no seu fluxo",
    body: "A equipa pesquisa, orçamenta e reserva sem sair da plataforma — e o cliente acompanha online.",
  },
] as const;

export const PRICING_SECTION = {
  title: "Planos transparentes, em euros",
  lead: "Subscrição mensal, semestral ou anual. Sem surpresas — e Enterprise quando precisa de escala à medida.",
};

export const CTA = {
  title: "Pronto para modernizar a sua agência?",
  lead: "Escolha um plano ou fale connosco. Respondemos a partir de Portugal, com foco no mercado nacional.",
};

export type PlanoPrecos = {
  mensal: number | null;
  semestral: number | null;
  anual: number | null;
};

export type Plano = {
  slug: string;
  nome: string;
  descricao: string;
  requires_sales_contact: boolean;
  highlighted?: boolean;
  precos: PlanoPrecos;
  feature_highlights: string[];
};

/** Alinhado com PlanoSeeder — editar aqui quando mudarem preços ou copy. */
export const PLANOS: Plano[] = [
  {
    slug: "entry",
    nome: "Entry",
    descricao: "Para começar — ideal para equipas pequenas.",
    requires_sales_contact: false,
    precos: { mensal: 49, semestral: 279, anual: 499 },
    feature_highlights: [
      "1 utilizador staff",
      "Motor de pesquisa",
      "Widget para o site",
      "Subdomínio TravelPlus",
      "Logo personalizado",
    ],
  },
  {
    slug: "standard",
    nome: "Standard",
    descricao: "O equilíbrio certo para a maioria das agências.",
    requires_sales_contact: false,
    highlighted: true,
    precos: { mensal: 99, semestral: 549, anual: 999 },
    feature_highlights: [
      "3 utilizadores staff",
      "Sem “Powered by”",
      "Reservas manuais",
      "Módulo geografia",
      "Domínio personalizado",
    ],
  },
  {
    slug: "premium",
    nome: "Premium",
    descricao: "Mais capacidade e branding completo.",
    requires_sales_contact: false,
    precos: { mensal: 199, semestral: 1099, anual: 1999 },
    feature_highlights: [
      "10 utilizadores staff",
      "Branding completo + favicon",
      "Todos os calendários e widgets",
      "Destaques na geografia",
      "Domínio personalizado",
    ],
  },
  {
    slug: "enterprise",
    nome: "Enterprise",
    descricao: "À medida — escala e acompanhamento dedicado.",
    requires_sales_contact: true,
    precos: { mensal: null, semestral: null, anual: null },
    feature_highlights: [
      "Todas as funcionalidades",
      "Utilizadores ilimitados",
      "Integrações à medida",
      "Acompanhamento comercial",
    ],
  },
];

export type DuracaoSubscricao = "mensal" | "semestral" | "anual";

export const DURACAO_LABELS: Record<DuracaoSubscricao, string> = {
  mensal: "Mensal",
  semestral: "Semestral",
  anual: "Anual",
};

export const DURACAO_PERIOD_SUFFIX: Record<DuracaoSubscricao, string> = {
  mensal: "/ mês",
  semestral: "/ semestre",
  anual: "/ ano",
};

/**
 * Serviço da adesão em passos (RNAVT → email → código → pagamento).
 *
 * O site é exportado estaticamente e ainda não tem backend, por isso estas
 * funções simulam a API com um pequeno atraso. Para ligar ao backend real,
 * substituir o corpo de cada função por um `fetch` ao endpoint
 * correspondente — a assinatura (Promise + erros com mensagem para o
 * utilizador) mantém-se e o formulário não precisa de mudar.
 */

export type MetodoPagamento = "cartao" | "mbway" | "multibanco" | "debito_direto";

export const METODOS_PAGAMENTO: {
  id: MetodoPagamento;
  label: string;
  descricao: string;
}[] = [
  { id: "cartao", label: "Cartão de crédito ou débito", descricao: "Visa, Mastercard e American Express." },
  { id: "mbway", label: "MB WAY", descricao: "Confirmação imediata no telemóvel." },
  { id: "multibanco", label: "Referência Multibanco", descricao: "Pagamento por referência em 72 horas." },
  { id: "debito_direto", label: "Débito direto (SEPA)", descricao: "Cobrança automática em cada renovação." },
];

export type AgenciaRnavt = {
  rnavt: string;
  nome: string;
  emails: string[];
};

export class AdesaoError extends Error {}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Procura a agência no Registo Nacional e devolve os emails registados. */
export async function procurarRnavt(rnavt: string): Promise<AgenciaRnavt> {
  await wait(700);
  if (/^0+$/.test(rnavt)) {
    throw new AdesaoError("Não encontrámos nenhuma agência com este RNAVT.");
  }
  const dominio = `agencia${rnavt}.pt`;
  return {
    rnavt,
    nome: `Agência de Viagens RNAVT ${rnavt}`,
    emails: [`geral@${dominio}`, `reservas@${dominio}`, `direcao@${dominio}`],
  };
}

/** Envia um código de 6 dígitos para o email escolhido. */
export async function enviarCodigo(email: string): Promise<void> {
  void email;
  await wait(600);
}

/** Confirma o código recebido por email. */
export async function confirmarCodigo(email: string, codigo: string): Promise<void> {
  void email;
  await wait(600);
  if (codigo === "000000") {
    throw new AdesaoError("O código não é válido. Confirme o email ou peça um novo código.");
  }
}

/** Cria a subscrição com o plano, duração e método de pagamento. */
export async function concluirSubscricao(dados: {
  rnavt: string;
  email: string;
  plano: string;
  duracao: string;
  metodo: MetodoPagamento;
}): Promise<void> {
  void dados;
  await wait(900);
}

/** "geral@agencia.pt" → "ge•••@agencia.pt" (o email só é mostrado em parte). */
export function mascararEmail(email: string): string {
  const [local, dominio] = email.split("@");
  if (!dominio) return email;
  const visivel = local.slice(0, Math.min(2, local.length));
  return `${visivel}${"•".repeat(Math.max(3, local.length - visivel.length))}@${dominio}`;
}

/**
 * Vocabulário das ordens de serviço: status, etapas, formatação.
 * Os status no banco são em inglês (pending/in_progress/completed/cancelled);
 * a tela nunca mostra esses valores crus.
 */

export type StatusOrdem = "pending" | "in_progress" | "completed" | "cancelled";

export const STATUS: Record<
  StatusOrdem,
  { rotulo: string; chip: string; ponto: string; resumo: string }
> = {
  pending: {
    rotulo: "Na fila",
    chip: "bg-secondary text-secondary-foreground",
    ponto: "bg-muted-foreground",
    resumo: "Recebemos o pedido. A oficina vai confirmar o horário.",
  },
  in_progress: {
    rotulo: "Em andamento",
    chip: "bg-accent text-accent-foreground",
    ponto: "bg-foreground",
    resumo: "O carro está na bancada agora.",
  },
  completed: {
    rotulo: "Concluído",
    chip: "bg-success text-success-foreground",
    ponto: "bg-success-foreground",
    resumo: "Serviço terminado. O carro está pronto para retirada.",
  },
  cancelled: {
    rotulo: "Cancelado",
    chip: "bg-destructive text-destructive-foreground",
    ponto: "bg-destructive-foreground",
    resumo: "Esta ordem foi cancelada.",
  },
};

export function ehStatus(valor: string): valor is StatusOrdem {
  return valor in STATUS;
}

export function statusDe(valor: string | null | undefined) {
  return ehStatus(valor ?? "") ? STATUS[valor as StatusOrdem] : STATUS.pending;
}

/** As 4 etapas que o cliente vê na linha do tempo. */
export const ETAPAS = [
  { chave: "aberta", rotulo: "Ordem aberta", descricao: "Seu pedido chegou até nós." },
  { chave: "fila", rotulo: "Na fila da oficina", descricao: "Aguardando a vez na bancada." },
  { chave: "andamento", rotulo: "Em andamento", descricao: "Serviço sendo executado." },
  { chave: "pronto", rotulo: "Concluído", descricao: "Pronto para retirada." },
] as const;

/** Índice da etapa atual na linha do tempo. */
export function etapaAtual(status: string): number {
  switch (status) {
    case "pending":
      return 1;
    case "in_progress":
      return 2;
    case "completed":
      return 3;
    default:
      return 1;
  }
}

/** Serviços que a oficina atende. O último existe porque é o caso mais comum. */
export const TIPOS_DE_SERVICO = [
  "Sistema elétrico — diagnóstico geral",
  "Bateria e alternador",
  "Injeção eletrônica",
  "Sistema de ignição",
  "Alarme, trava e vidro elétrico",
  "Revisão elétrica preventiva",
  "Não sei dizer — preciso de diagnóstico",
] as const;

export function formatarData(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatarDataHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatarMoeda(valor: number | string | null | undefined): string | null {
  if (valor === null || valor === undefined || valor === "") return null;
  const n = typeof valor === "string" ? Number(valor) : valor;
  if (Number.isNaN(n)) return null;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Código curto que o cliente lê ao telefone, derivado do uuid. */
export function codigoDaOrdem(id: string): string {
  return `OS-${id.slice(0, 6).toUpperCase()}`;
}

/** Normaliza a placa enquanto o usuário digita: ABC1D23. */
export function normalizarPlaca(valor: string): string {
  return valor
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 7);
}

export function placaValida(placa: string): boolean {
  // Padrão antigo (ABC1234) e Mercosul (ABC1D23).
  return /^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(placa);
}

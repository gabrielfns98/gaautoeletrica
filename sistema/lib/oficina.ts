/**
 * Identidade da oficina usada na UI e no PDF do orçamento.
 * Não existe tela de configuração: edite este arquivo e troque /public/logo.png.
 */
export const OFICINA = {
  nome: "Oficina Mecânica D Multimarcas",
  telefone: "(34) 98816-6509",
  whatsapp: "5534988166509", // só dígitos, com 55 + DDD (usado no link wa.me)
  endereco: "Rua Terezinha Cândida Mendonça, 59 — Bairro Filhinha Mendes",
  cidade: "", // opcional: "" esconde do PDF
  cnpj: "14.263.699/0001-72",
  email: "", // opcional: "" esconde do PDF
  instagram: "", // opcional: "" esconde do PDF
  pix: "14.263.699/0001-72", // opcional: "" esconde do PDF
  corPrimaria: "#1D4ED8",
  condicoesPadrao: [
    "Orçamento sujeito a alteração caso sejam encontrados outros defeitos durante o serviço.",
    "Pagamento: 50% na aprovação e 50% na retirada do veículo. Aceitamos PIX, dinheiro e cartão.",
    "Garantia de 90 dias para a mão de obra e garantia do fabricante para as peças aplicadas.",
    "Peças substituídas ficam à disposição do cliente por 7 dias.",
  ].join("\n"),
} as const;

/** Texto pré-preenchido no campo de observações do orçamento da OS. */
export const OBSERVACOES_ORCAMENTO_PADRAO = OFICINA.condicoesPadrao;

/** "ORC-0042" */
export function numeroOrcamento(numero: number): string {
  return `ORC-${String(numero).padStart(4, "0")}`;
}

/** "0042" */
export function numeroCurto(numero: number): string {
  return String(numero).padStart(4, "0");
}

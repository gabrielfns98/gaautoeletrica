/**
 * Identidade da oficina usada na UI e no PDF do orçamento.
 * Não existe tela de configuração: edite este arquivo e troque /public/logo.png.
 */
export const OFICINA = {
  nome: "Oficina",
  telefone: "(11) 99999-0000",
  whatsapp: "5511999990000", // só dígitos, com 55 + DDD (usado no link wa.me)
  endereco: "Rua das Oficinas, 123 — Vila Industrial",
  cidade: "São Paulo — SP",
  cnpj: "12.345.678/0001-90",
  email: "contato@oficina.com.br",
  instagram: "", // opcional: "" esconde do PDF
  pix: "12.345.678/0001-90", // opcional: "" esconde do PDF
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

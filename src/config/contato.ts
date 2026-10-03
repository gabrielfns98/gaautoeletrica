/**
 * Dados de contato da oficina — fonte única.
 * Antes isto estava duplicado em 3 arquivos, com dois números de WhatsApp diferentes
 * e nenhum deles batendo com o telefone exibido na tela.
 */
export const OFICINA = {
  nome: "G.A Auto Elétrica",
  telefones: ["(34) 9 9866-7638", "(34) 9 9763-0033"],
  /** Número exibido, em formato internacional, para links wa.me */
  whatsapp: "5534998667638",
  email: "contato@gaautoeletrica.com.br",
  endereco: {
    linha1: "Rua Carlos Finholdt Júnior, 156",
    linha2: "Res. Guilherme Borges de Oliveira",
    cidade: "Uberaba — MG",
    cep: "38035-280",
  },
  horario: {
    resumo: "Seg a sex, 8h às 18h",
    dias: "Segunda a sexta",
    faixa: "8h às 18h",
  },
} as const;

/** Monta um link de WhatsApp com a mensagem já preenchida. */
export function linkWhatsApp(mensagem: string): string {
  return `https://wa.me/${OFICINA.whatsapp}?text=${encodeURIComponent(mensagem)}`;
}

/** Endereço em uma linha, para o link do mapa. */
export function enderecoCompleto(): string {
  const { linha1, linha2, cidade, cep } = OFICINA.endereco;
  return `${linha1}, ${linha2}, ${cidade}, ${cep}`;
}

/**
 * Configuração do Treinamento de Natal — G.A. Auto Elétrica.
 *
 * ⚠️ PREENCHER ANTES DE PUBLICAR:
 *   - pix.chave            → chave Pix que vai receber (CNPJ, CPF, e-mail, telefone +55... ou aleatória)
 *   - pix.nomeRecebedor    → nome do titular da conta (como aparece no banco, até 25 letras)
 *   - valor / valorAVista  → preço do curso (deixe null para "consulte pelo WhatsApp")
 *   - linkPagamento        → link de pagamento do cartão (Mercado Pago, PagSeguro, InfinitePay, Stone...)
 *
 * Enquanto a chave Pix ou o link não estiverem preenchidos, a página mostra
 * a opção de finalizar o pagamento pelo WhatsApp no lugar deles.
 */
const CONFIG = {
  turma: "natal-2026",
  titulo: "Autoelétrica básica para iniciantes",
  cargaHoraria: 13,

  /** Preço cheio (cartão / link de pagamento). null = "consulte". */
  valor: null as number | null,
  /** Preço no Pix. null = mesmo valor de `valor`. */
  valorPix: null as number | null,
  /** Texto curto sobre parcelamento exibido junto ao preço, ex.: "ou em até 3x no cartão". */
  condicoes: "",

  vagas: {
    /** Mostra o aviso de vagas limitadas. */
    limitadas: true,
  },

  datas: [
    { dia: "Sexta-feira", data: "18/12", horario: "das 19h às 22h", iso: "2026-12-18T19:00:00-03:00" },
    { dia: "Sábado", data: "19/12", horario: "das 7h30 às 17h30", iso: "2026-12-19T07:30:00-03:00" },
  ],

  pix: {
    chave: "27182784000172", // CNPJ
    nomeRecebedor: "GA AUTO ELETRICA",
    cidade: "UBERABA",
  },

  /** Link de pagamento para cartão de crédito/débito. Vazio = finalizar pelo WhatsApp. */
  linkPagamento: "",

  whatsapp: {
    /** Somente números, com DDI 55 + DDD. */
    numero: "5534998667638",
    exibicao: "(34) 9 9866-7638",
  },

  endereco: {
    linha1: "Rua Sebastiana Teresa da Silva Montadon, 40",
    linha2: "Residencial Filinha Mendes · Uberaba-MG · CEP 38035-676",
    mapsUrl:
      "https://www.google.com/maps/search/?api=1&query=" +
      encodeURIComponent("Rua Sebastiana Teresa da Silva Montadon, 40, Uberaba - MG, 38035-676"),
  },
};

/**
 * Modo de teste: ativado só no build de demonstração (`vite build --mode demo`).
 * Usa a configuração real, mas não grava as inscrições no banco.
 */
export const MODO_DEMO = import.meta.env.VITE_CURSO_DEMO === "1";

export const CURSO = CONFIG;

export const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const whatsappLink = (mensagem: string) =>
  `https://wa.me/${CURSO.whatsapp.numero}?text=${encodeURIComponent(mensagem)}`;

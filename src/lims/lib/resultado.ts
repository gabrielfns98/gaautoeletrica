/* ============================================================
   BANCADA — como um resultado vira texto no laudo

   Os laudos que o laboratório emite hoje trazem, no mesmo documento,
   "0.75" e "99,13%"; "0.00" para um resultado que na verdade ficou
   abaixo do limite de quantificação; e "%" na relação C/N, que não
   tem unidade nenhuma. Nenhum desses é erro de digitação do
   analista: são decisões que ninguém tomou, espalhadas por onde o
   número é impresso.

   Aqui elas são tomadas uma vez.
   ============================================================ */

import { numero } from './format';
import type { FaixaLegenda, Parametro } from '../types';

/* ---------------- Abaixo do limite de quantificação ---------------- */

/**
 * O resultado como ele deve sair no laudo.
 *
 * Abaixo do limite de quantificação o laboratório não mediu zero —
 * ele mediu "menos que o método consegue afirmar". Imprimir "0,00"
 * diz ao cliente que o elemento não está lá, que é uma afirmação que
 * o ensaio não sustenta e que, num laudo de fertilizante, é a
 * diferença entre aprovar e reprovar um lote.
 */
export function textoDoResultado(
  valor: number | undefined,
  parametro: Pick<Parametro, 'casasDecimais' | 'lq'>,
): string {
  if (valor === undefined || !Number.isFinite(valor)) return '—';
  const { lq, casasDecimais } = parametro;
  if (lq !== undefined && valor < lq) return `< ${numero(lq, casasDecimais)}`;
  return numero(valor, casasDecimais);
}

/** Verdadeiro quando o número não pode ser reportado como número. */
export function abaixoDoLq(
  valor: number | undefined,
  lq: number | undefined,
): boolean {
  if (valor === undefined || !Number.isFinite(valor) || lq === undefined) return false;
  return valor < lq;
}

/* ---------------- Unidade ---------------- */

/**
 * A unidade como ela sai no laudo.
 *
 * Relação entre elementos — C/N, N/P, Ca/Mg — é adimensional: ela
 * divide g/kg por g/kg. O laudo atual imprime "%" na C/N, o que
 * sugere uma porcentagem que não existe. Relação sai com travessão,
 * como nos modelos do laboratório.
 */
export function textoDaUnidade(parametro: Pick<Parametro, 'unidade' | 'ehRelacao'>): string {
  if (parametro.ehRelacao) return '--';
  return parametro.unidade?.trim() || '--';
}

/* ---------------- Garantia (Modelo A) ---------------- */

export type TipoGarantia = 'minimo' | 'maximo' | 'exato';

export interface Garantia {
  valor: number;
  tipo: TipoGarantia;
}

/**
 * Lê a garantia declarada pelo fabricante.
 *
 * Aceita "95,00 Mín.", "40,00 Máx." e "12,5" — as três formas que
 * aparecem nos laudos de fertilizante. Vírgula é o separador, porque
 * é o que o laboratório digita.
 */
export function lerGarantia(texto: string | undefined): Garantia | undefined {
  if (!texto) return undefined;
  const limpo = texto.trim();
  if (!limpo) return undefined;

  /* Exige dígito: sem isto, o ponto de "Mín." casa sozinho e vira
     uma garantia de zero — que reprovaria todo lote medido. */
  const numeroBruto = limpo.match(/-?\d[\d.,]*/)?.[0];
  if (!numeroBruto) return undefined;

  /* "1.234,56" é milhar com decimal; "95,00" é só decimal. Tirar o
     ponto antes de trocar a vírgula resolve os dois. */
  const valor = Number(numeroBruto.replace(/\./g, '').replace(',', '.'));
  if (!Number.isFinite(valor)) return undefined;

  const resto = limpo.slice(limpo.indexOf(numeroBruto) + numeroBruto.length).toLowerCase();
  const semAcento = resto.normalize('NFD').replace(/[̀-ͯ]/g, '');

  if (semAcento.includes('min')) return { valor, tipo: 'minimo' };
  if (semAcento.includes('max')) return { valor, tipo: 'maximo' };
  return { valor, tipo: 'exato' };
}

/** Como a garantia aparece na coluna, a partir do que foi cadastrado. */
export function textoDaGarantia(
  garantia: Garantia | undefined,
  casasDecimais: number,
): string {
  if (!garantia) return '';
  const n = numero(garantia.valor, casasDecimais);
  if (garantia.tipo === 'minimo') return `${n} Mín.`;
  if (garantia.tipo === 'maximo') return `${n} Máx.`;
  return n;
}

/**
 * O resultado atende à garantia?
 *
 * Mínimo cobra piso, máximo cobra teto, e garantia exata é o caso em
 * que o fabricante declarou um número cheio — aí o laudo só destaca
 * quando o resultado fica abaixo dele, que é o que reprova o lote.
 */
export function cumpreGarantia(
  valor: number | undefined,
  garantia: Garantia | undefined,
): boolean {
  if (!garantia || valor === undefined || !Number.isFinite(valor)) return true;
  if (garantia.tipo === 'minimo') return valor >= garantia.valor;
  if (garantia.tipo === 'maximo') return valor <= garantia.valor;
  return valor >= garantia.valor;
}

/* ---------------- Nível de suficiência (Modelo B) ---------------- */

export type Nivel = 'baixo' | 'medio' | 'alto';

export interface Suficiencia {
  nivel: Nivel;
  /** 0 a 1 — onde o marcador fica na barra Baixo | Médio | Alto */
  posicao: number;
}

export const ROTULO_NIVEL: Record<Nivel, string> = {
  baixo: 'Baixo',
  medio: 'Médio',
  alto: 'Alto',
};

/**
 * Onde o resultado cai na faixa adequada da cultura.
 *
 * A barra tem três terços: abaixo do mínimo, dentro, acima do
 * máximo. Dentro da faixa o marcador anda proporcionalmente, para o
 * agrônomo ver se o elemento está no começo ou no fim do adequado.
 * Fora dela o marcador encosta na ponta — "muito baixo" e "baixo" já
 * pedem a mesma decisão, e esticar a escala só faria a barra mentir
 * sobre a distância.
 */
export function nivelDeSuficiencia(
  valor: number | undefined,
  minimo: number | undefined,
  maximo: number | undefined,
): Suficiencia | undefined {
  if (valor === undefined || !Number.isFinite(valor)) return undefined;
  if (minimo === undefined || maximo === undefined) return undefined;
  if (!(maximo > minimo)) return undefined;

  if (valor < minimo) {
    const fundo = minimo - (maximo - minimo);
    const dentro = fundo === minimo ? 0 : (valor - fundo) / (minimo - fundo);
    return { nivel: 'baixo', posicao: Math.max(0.02, Math.min(1, dentro)) / 3 };
  }
  if (valor > maximo) {
    const teto = maximo + (maximo - minimo);
    const dentro = teto === maximo ? 1 : (valor - maximo) / (teto - maximo);
    return { nivel: 'alto', posicao: 2 / 3 + Math.max(0, Math.min(0.98, dentro)) / 3 };
  }
  return { nivel: 'medio', posicao: 1 / 3 + ((valor - minimo) / (maximo - minimo)) / 3 };
}

/** O texto "20-25" da coluna Valor Adequado, a partir da faixa cadastrada. */
export function textoDaFaixa(
  minimo: number | undefined,
  maximo: number | undefined,
  casasDecimais = 1,
): string {
  if (minimo === undefined || maximo === undefined) return '—';
  const n = (v: number) => (Number.isInteger(v) ? String(v) : numero(v, casasDecimais));
  return `${n(minimo)}-${n(maximo)}`;
}

/**
 * A faixa adequada da legenda da cultura.
 *
 * A legenda tem várias faixas (muito baixo, baixo, médio, bom...); a
 * "adequada" do laudo foliar é a marcada como ideal. Sem ela, não há
 * o que imprimir — e imprimir qualquer coisa foi o que gerou o "1-10"
 * em todos os elementos do laudo de uva.
 */
export function faixaAdequada(
  faixas: FaixaLegenda[] | undefined,
): { minimo?: number; maximo?: number } | undefined {
  const ideal = faixas?.find((f) => f.severidade === 'ideal');
  if (!ideal) return undefined;
  if (ideal.de === undefined && ideal.ate === undefined) return undefined;
  return { minimo: ideal.de, maximo: ideal.ate };
}

/* ---------------- Conferência antes de emitir ---------------- */

export type GravidadeProblema = 'impede' | 'avisa';

export interface ProblemaLaudo {
  gravidade: GravidadeProblema;
  /** o que está errado, na linguagem de quem assina */
  mensagem: string;
  /** o ensaio ou a amostra em que o problema aparece */
  onde?: string;
}

export interface EntradaConferencia {
  /** a cultura declarada na amostra, quando o laudo interpreta por cultura */
  cultura?: string;
  itens: Array<{
    codigo: string;
    valor: number | undefined;
    lq?: number;
    /** a faixa adequada resolvida para esta cultura, se houver */
    faixa?: { minimo?: number; maximo?: number };
    /** o laudo imprime a faixa adequada deste ensaio */
    exigeFaixa?: boolean;
    metodo?: string;
  }>;
}

/**
 * O que impede o laudo de ser emitido, e o que apenas merece um aviso.
 *
 * A regra que faltava: sem faixa cadastrada para a cultura, o laudo
 * não sai. Foi imprimir mesmo assim que produziu o laudo de uva com
 * "1-10" em todos os onze elementos e o enxofre em branco — um
 * documento que o agrônomo não tem como usar e que o laboratório
 * assinou.
 */
export function conferirLaudo(entrada: EntradaConferencia): ProblemaLaudo[] {
  const problemas: ProblemaLaudo[] = [];

  const semFaixa = entrada.itens
    .filter((i) => i.exigeFaixa)
    .filter((i) => {
      const f = i.faixa;
      return !f || f.minimo === undefined || f.maximo === undefined || !(f.maximo > f.minimo);
    })
    .map((i) => i.codigo);

  if (semFaixa.length > 0) {
    problemas.push({
      gravidade: 'impede',
      mensagem: entrada.cultura
        ? `Sem faixa adequada cadastrada para ${entrada.cultura} em ${semFaixa.length} ensaio(s). Cadastre a legenda da cultura antes de emitir.`
        : `Sem faixa adequada cadastrada em ${semFaixa.length} ensaio(s).`,
      onde: semFaixa.join(', '),
    });
  }

  const semMetodo = entrada.itens.filter((i) => !i.metodo?.trim()).map((i) => i.codigo);
  if (semMetodo.length > 0) {
    problemas.push({
      gravidade: 'avisa',
      mensagem: `${semMetodo.length} ensaio(s) sem método declarado — a coluna Método sai em branco.`,
      onde: semMetodo.join(', '),
    });
  }

  const semValor = entrada.itens
    .filter((i) => i.valor === undefined || !Number.isFinite(i.valor))
    .map((i) => i.codigo);
  if (semValor.length > 0) {
    problemas.push({
      gravidade: 'avisa',
      mensagem: `${semValor.length} ensaio(s) sem resultado.`,
      onde: semValor.join(', '),
    });
  }

  return problemas;
}

/** Atalho: o laudo pode ser assinado? */
export const podeEmitir = (problemas: ProblemaLaudo[]) =>
  !problemas.some((p) => p.gravidade === 'impede');

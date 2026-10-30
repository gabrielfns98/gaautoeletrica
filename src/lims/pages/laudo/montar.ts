/* ============================================================
   BANCADA — montagem do laudo

   Separado da tela de propósito: o que entra no laudo é regra de
   negócio ("só resultado aprovado assina"), e regra de negócio se
   testa sem renderizar componente.
   ============================================================ */

import { interpretar } from '../../lib/interpretacao';
import type { Interpretacao } from '../../lib/interpretacao';
import type { Amostra, Ensaio, Laudo, Legenda, ModeloLaudo, Parametro } from '../../types';

export interface ResultadoLaudo {
  ensaio: Ensaio;
  parametro: Parametro;
  interpretacao?: Interpretacao;
}

export interface AmostraDoLaudo {
  amostra: Amostra;
  resultados: ResultadoLaudo[];
}

export interface LaudoMontado {
  amostras: AmostraDoLaudo[];
  /** parâmetros que aparecem no laudo, na ordem do cadastro */
  parametros: Parametro[];
  /** total de resultados aprovados — zero significa laudo sem conteúdo */
  totalResultados: number;
  /** referências de interpretação citadas, para o rodapé */
  fontes: string[];
}

export interface EntradaMontagem {
  laudo: Laudo;
  amostras: Amostra[];
  ensaios: Ensaio[];
  parametros: Parametro[];
  legendas: Legenda[];
  /** cultura da amostra, quando o laboratório cadastrou legenda por cultura */
  culturaDe?: (amostra: Amostra) => string | undefined;
}

/**
 * Compila o laudo a partir do estado.
 *
 * Só resultado **aprovado** entra: o laudo é o documento que o
 * responsável técnico assina, e assinar número que ainda não passou
 * pela revisão é exatamente o que a ISO/IEC 17025 proíbe. Resultado
 * pendente simplesmente não aparece — e `totalResultados` zerado
 * avisa a tela para dizer isso em vez de desenhar tabela vazia.
 */
export function montarLaudo({
  laudo, amostras, ensaios, parametros, legendas, culturaDe,
}: EntradaMontagem): LaudoMontado {
  const noLaudo = new Set(laudo.amostraIds);
  const porId = new Map(parametros.map((p) => [p.id, p]));

  // A ordem do laudo é a ordem do cadastro de parâmetros, não a ordem
  // em que a bancada terminou os ensaios: dois laudos do mesmo pacote
  // têm de sair com as colunas na mesma sequência.
  const ordem = new Map(parametros.map((p, i) => [p.id, i]));

  const aprovadosPorAmostra = new Map<string, Ensaio[]>();
  for (const e of ensaios) {
    if (e.status !== 'aprovado' || !noLaudo.has(e.amostraId)) continue;
    if (!porId.has(e.parametroId)) continue;
    const lista = aprovadosPorAmostra.get(e.amostraId) ?? [];
    lista.push(e);
    aprovadosPorAmostra.set(e.amostraId, lista);
  }

  const usados = new Set<string>();
  const fontes = new Set<string>();
  let totalResultados = 0;

  const montadas: AmostraDoLaudo[] = amostras
    .filter((a) => noLaudo.has(a.id))
    .sort((a, b) => a.protocolo.localeCompare(b.protocolo, 'pt-BR', { numeric: true }))
    .map((amostra) => {
      const cultura = culturaDe?.(amostra);
      const resultados = (aprovadosPorAmostra.get(amostra.id) ?? [])
        .sort((x, y) => (ordem.get(x.parametroId) ?? 0) - (ordem.get(y.parametroId) ?? 0))
        .map((ensaio) => {
          const parametro = porId.get(ensaio.parametroId)!;
          usados.add(parametro.id);
          totalResultados += 1;
          const interpretacao = interpretar(legendas, parametro.id, ensaio.valor, cultura);
          if (interpretacao) fontes.add(interpretacao.legenda.fonte);
          return { ensaio, parametro, interpretacao };
        });
      return { amostra, resultados };
    });

  return {
    amostras: montadas,
    parametros: parametros.filter((p) => usados.has(p.id)),
    totalResultados,
    fontes: [...fontes].sort((a, b) => a.localeCompare(b, 'pt-BR')),
  };
}

/* ---------------- Modelo do laudo ---------------- */

/** O que a folha usa quando o laboratório não cadastrou modelo. */
export const MODELO_PADRAO: ModeloLaudo = {
  id: 'mdl-padrao',
  nome: 'Padrão do sistema',
  ordemParametros: [],
  agrupamento: 'nenhum',
  layout: 'generico',
  mostrarTabelaReferencia: false,
  observacaoIds: [],
  mostrarIncerteza: true,
  mostrarInterpretacao: true,
  mostrarMetodos: true,
  cargoAssinatura: 'Responsável técnico',
  disposicaoPadrao: 'amostra',
  ativo: true,
};

/**
 * Qual modelo vale para este laudo.
 *
 * Precedência: unidade + análise > análise > unidade > geral. Um
 * grupo com dois CNPJs quer timbre diferente por unidade, e o laudo
 * de água não se parece com o de solo — os dois casos somados pedem
 * esta ordem, e não uma lista de regras.
 */
export function modeloDoLaudo(
  modelos: ModeloLaudo[],
  unidadeId: string | undefined,
  grupoId: string | undefined,
): ModeloLaudo {
  const candidatos = modelos.filter((m) => m.ativo)
    .filter((m) => !m.unidadeId || m.unidadeId === unidadeId)
    .filter((m) => !m.grupoId || m.grupoId === grupoId);

  const peso = (m: ModeloLaudo) => (m.unidadeId ? 2 : 0) + (m.grupoId ? 1 : 0);
  return [...candidatos].sort((a, b) => peso(b) - peso(a))[0] ?? MODELO_PADRAO;
}

/**
 * Reordena os parâmetros do laudo conforme o modelo.
 *
 * O que o modelo não lista vai depois, na ordem do cadastro: um
 * elemento acrescentado ao escopo não pode sumir do laudo só porque
 * ninguém lembrou de incluí-lo no modelo.
 */
export function ordenarPeloModelo(parametros: Parametro[], ordem: string[]): Parametro[] {
  if (ordem.length === 0) return parametros;
  const posicao = new Map(ordem.map((id, i) => [id, i]));
  return [...parametros].sort((a, b) => {
    const pa = posicao.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const pb = posicao.get(b.id) ?? Number.MAX_SAFE_INTEGER;
    return pa - pb;
  });
}

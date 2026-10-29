/* ============================================================
   BANCADA — leitura e escrita no banco
   Fala com o Supabase e devolve domínio. As regras duras —
   segregação de função, calibração vencida, saldo de estoque —
   moram no banco como gatilho; aqui o erro só é traduzido para
   uma frase que o analista entenda.
   ============================================================ */

import { exigirBanco } from './supabase';
import {
  deAmostra, deCalibracao, deCliente, deEnsaio, deEquipamento, deGrupo,
  deLeituraPh, deLote, deMembro, dePapel, deParametro, deTabelaPreco, deUnidade,
  paraAmostra, paraCalibracao, paraEnsaio, paraLeituraPh, paraLote,
} from './mapas';
import type {
  LinhaAmostra, LinhaCalibracao, LinhaCliente, LinhaEnsaio, LinhaEquipamento,
  LinhaGrupo, LinhaLeituraPh, LinhaLote, LinhaMembro, LinhaPapel, LinhaParametro,
  LinhaTabelaPreco, LinhaUnidade,
} from './mapas';
import type {
  Amostra, Calibracao, Cliente, Ensaio, Equipamento, GrupoAnalise, LeituraPh,
  LoteRecepcao, Papel, Parametro, StatusAmostra, TabelaPreco, Unidade, Usuario, UUID,
} from '../types';

/** Teto de amostras trazidas na carga inicial, das mais recentes para trás. */
const TETO_AMOSTRAS = 5000;
const PAGINA = 1000;

export interface CargaBancada {
  unidades: Unidade[];
  papeis: Papel[];
  usuarios: Usuario[];
  usuarioAtualId: UUID;
  grupos: GrupoAnalise[];
  parametros: Parametro[];
  tabelasPreco: TabelaPreco[];
  clientes: Cliente[];
  lotesRecepcao: LoteRecepcao[];
  amostras: Amostra[];
  ensaios: Ensaio[];
  equipamentos: Equipamento[];
  calibracoes: Calibracao[];
  leiturasPh: LeituraPh[];
}

/** PostgREST devolve no máximo mil linhas por vez; aqui a página é interna. */
async function tudo<T>(
  tabela: string,
  colunas: string,
  ordenar?: { coluna: string; crescente?: boolean },
  teto = Infinity,
): Promise<T[]> {
  const banco = exigirBanco();
  const acumulado: T[] = [];
  for (let inicio = 0; inicio < teto; inicio += PAGINA) {
    let consulta = banco.from(tabela).select(colunas).range(inicio, inicio + PAGINA - 1);
    if (ordenar) consulta = consulta.order(ordenar.coluna, { ascending: ordenar.crescente ?? true });
    const { data, error } = await consulta;
    if (error) throw new Error(`${tabela}: ${error.message}`);
    const pagina = (data ?? []) as unknown as T[];
    acumulado.push(...pagina);
    if (pagina.length < PAGINA) break;
  }
  return acumulado;
}

/** `in` tem limite prático de URL: as chaves vão em blocos. */
async function porChaves<T>(tabela: string, colunas: string, campo: string, ids: string[]): Promise<T[]> {
  const banco = exigirBanco();
  const acumulado: T[] = [];
  for (let i = 0; i < ids.length; i += 200) {
    const bloco = ids.slice(i, i + 200);
    const { data, error } = await banco.from(tabela).select(colunas).in(campo, bloco);
    if (error) throw new Error(`${tabela}: ${error.message}`);
    acumulado.push(...((data ?? []) as unknown as T[]));
  }
  return acumulado;
}

const COLUNAS_LEITURA =
  'id,ensaio_id,amostra_id,parametro_id,equipamento_id,calibracao_id,analista_id,' +
  'origem,mv,temperatura,ph_bruto,ph_corrigido,deriva_mv_por_min,estavel,' +
  'tempo_estabilizacao_s,extrator,proporcao,data_hora,replica_de,observacao';

/**
 * Carga inicial. O `trace` das leituras fica de fora de propósito: são
 * milhares de pontos por leitura e só interessam quando alguém abre
 * aquela leitura específica.
 */
export async function carregarBancada(): Promise<CargaBancada> {
  const banco = exigirBanco();

  const { data: sessao } = await banco.auth.getUser();
  const userId = sessao.user?.id;
  if (!userId) throw new Error('Sessão expirada. Entre novamente.');

  const [unidades, papeis, membros, vinculos, grupos, parametros, tabelasPreco, clientes, equipamentos] =
    await Promise.all([
      tudo<LinhaUnidade>('lab_unidades', '*', { coluna: 'codigo' }),
      tudo<LinhaPapel>('lab_papeis', '*', { coluna: 'nome' }),
      tudo<LinhaMembro>('lab_membros', '*', { coluna: 'nome' }),
      tudo<{ membro_id: string; unidade_id: string }>('lab_membros_unidades', '*'),
      tudo<LinhaGrupo>('lab_grupos_analise', '*', { coluna: 'nome' }),
      tudo<LinhaParametro>('lab_parametros', '*', { coluna: 'codigo' }),
      tudo<LinhaTabelaPreco>('lab_tabelas_preco', '*', { coluna: 'nome' }),
      tudo<LinhaCliente>('lab_clientes', '*', { coluna: 'nome' }),
      tudo<LinhaEquipamento>('lab_equipamentos', '*', { coluna: 'tag' }),
    ]);

  const unidadesDo = new Map<string, UUID[]>();
  for (const v of vinculos) {
    const lista = unidadesDo.get(v.membro_id) ?? [];
    lista.push(v.unidade_id);
    unidadesDo.set(v.membro_id, lista);
  }

  const usuarios = membros.map((m) => deMembro(m, unidadesDo.get(m.id) ?? []));
  const eu = membros.find((m) => m.user_id === userId);
  if (!eu) {
    throw new Error(
      'Sua conta não está vinculada a nenhum membro do laboratório. ' +
      'Peça ao administrador para criar o vínculo em lab_membros.',
    );
  }

  const linhasAmostra = await tudo<LinhaAmostra>(
    'lab_amostras', '*', { coluna: 'data_recepcao', crescente: false }, TETO_AMOSTRAS,
  );
  const idsAmostra = linhasAmostra.map((a) => a.id);

  const [linhasLote, linhasEnsaio, linhasCalibracao] = await Promise.all([
    tudo<LinhaLote>('lab_lotes_recepcao', '*', { coluna: 'data_recepcao', crescente: false }),
    porChaves<LinhaEnsaio>('lab_ensaios', '*', 'amostra_id', idsAmostra),
    tudo<LinhaCalibracao>('lab_calibracoes', '*', { coluna: 'data', crescente: false }),
  ]);

  const linhasLeitura = await porChaves<LinhaLeituraPh>(
    'lab_leituras_ph', COLUNAS_LEITURA, 'amostra_id', idsAmostra,
  );

  return {
    unidades: unidades.map(deUnidade),
    papeis: papeis.map(dePapel),
    usuarios,
    usuarioAtualId: eu.id,
    grupos: grupos.map(deGrupo),
    parametros: parametros.map(deParametro),
    tabelasPreco: tabelasPreco.map(deTabelaPreco),
    clientes: clientes.map(deCliente),
    lotesRecepcao: linhasLote.map(deLote),
    amostras: linhasAmostra.map(deAmostra),
    ensaios: linhasEnsaio.map(deEnsaio),
    equipamentos: equipamentos.map(deEquipamento),
    calibracoes: linhasCalibracao.map(deCalibracao),
    leiturasPh: linhasLeitura.map((l) => deLeituraPh({ ...l, trace: null })),
  };
}

/* ---------------- escrita ---------------- */

function estourar(contexto: string, erro: { message: string } | null): void {
  if (erro) throw new Error(`${contexto}: ${erro.message}`);
}

/** Recepção é tudo-ou-nada na prática: lote, amostras e ensaios na ordem das chaves. */
export async function gravarRecepcao(
  lote: LoteRecepcao, amostras: Amostra[], ensaios: Ensaio[], unidadeId: UUID,
): Promise<void> {
  const banco = exigirBanco();
  estourar('lote de recepção', (await banco.from('lab_lotes_recepcao').insert(paraLote(lote, unidadeId))).error);
  estourar('amostras', (await banco.from('lab_amostras').insert(amostras.map(paraAmostra))).error);
  if (ensaios.length > 0) {
    estourar('ensaios', (await banco.from('lab_ensaios').insert(ensaios.map(paraEnsaio))).error);
  }
}

/**
 * Lançamento em bloco. Lê os ensaios antes de regravar porque a tabela
 * exige amostra e parâmetro em toda linha — mandar só o valor não passa.
 */
export async function gravarResultados(
  entradas: Array<{ ensaioId: UUID; valor: number }>, analistaId: UUID,
): Promise<void> {
  if (entradas.length === 0) return;
  const banco = exigirBanco();
  const atuais = await porChaves<LinhaEnsaio>(
    'lab_ensaios', '*', 'id', entradas.map((e) => e.ensaioId),
  );
  const porId = new Map(atuais.map((l) => [l.id, l]));
  const agora = new Date().toISOString();

  const linhas = entradas.flatMap(({ ensaioId, valor }) => {
    const atual = porId.get(ensaioId);
    if (!atual) return [];
    return [{ ...atual, valor, status: 'lido', analista_id: analistaId, data_leitura: agora }];
  });

  for (let i = 0; i < linhas.length; i += 500) {
    estourar('resultados', (await banco.from('lab_ensaios').upsert(linhas.slice(i, i + 500))).error);
  }
}

/** Campos do ensaio que a aplicação altera, e a coluna de cada um. */
const COLUNA_ENSAIO: Record<string, string> = {
  status: 'status', valor: 'valor', valorTexto: 'valor_texto', unidade: 'unidade_medida',
  analistaId: 'analista_id', revisorId: 'revisor_id', dataLeitura: 'data_leitura',
  dataAprovacao: 'data_aprovacao', leituraPhId: 'leitura_ph_id',
  foraDeFaixa: 'fora_de_faixa', observacao: 'observacao',
};

/** Só vai para o banco o que veio em `dados`: um update parcial não pode
    zerar coluna que ninguém pediu para mudar. */
export async function gravarEnsaio(ensaioId: UUID, dados: Partial<Ensaio>): Promise<void> {
  const parcial: Record<string, unknown> = {};
  for (const [campo, coluna] of Object.entries(COLUNA_ENSAIO)) {
    if (campo in dados) parcial[coluna] = (dados as Record<string, unknown>)[campo] ?? null;
  }
  if (Object.keys(parcial).length === 0) return;
  const banco = exigirBanco();
  estourar('ensaio', (await banco.from('lab_ensaios').update(parcial).eq('id', ensaioId)).error);
}

export async function gravarStatusAmostra(amostraId: UUID, status: StatusAmostra): Promise<void> {
  const banco = exigirBanco();
  estourar('amostra', (await banco.from('lab_amostras').update({ status }).eq('id', amostraId)).error);
}

/** A leitura entra primeiro; só então o ensaio aponta para ela. */
export async function gravarLeitura(leitura: LeituraPh, valor: number): Promise<void> {
  const banco = exigirBanco();
  estourar('leitura de pH', (await banco.from('lab_leituras_ph').insert(paraLeituraPh(leitura))).error);
  estourar('ensaio da leitura', (await banco.from('lab_ensaios').update({
    valor,
    status: 'lido',
    analista_id: leitura.analistaId || null,
    data_leitura: leitura.dataHora,
    leitura_ph_id: leitura.id,
  }).eq('id', leitura.ensaioId)).error);
}

export async function gravarCalibracao(calibracao: Calibracao): Promise<void> {
  const banco = exigirBanco();
  estourar('calibração', (await banco.from('lab_calibracoes').insert(paraCalibracao(calibracao))).error);
}

/** Carrega o trace de uma leitura sob demanda — não vem na carga inicial. */
export async function carregarTrace(leituraId: UUID): Promise<LeituraPh['trace']> {
  const banco = exigirBanco();
  const { data, error } = await banco.from('lab_leituras_ph').select('trace').eq('id', leituraId).single();
  if (error) throw new Error(`trace: ${error.message}`);
  return (data?.trace ?? undefined) as LeituraPh['trace'];
}

/* ============================================================
   BANCADA — leitura e escrita no banco
   Fala com o Supabase e devolve domínio. As regras duras —
   segregação de função, calibração vencida, saldo de estoque —
   moram no banco como gatilho; aqui o erro só é traduzido para
   uma frase que o analista entenda.
   ============================================================ */

import { exigirBanco } from './supabase';
import {
  deAmostra, deAmostraControle, deAuditoria, deBandeja, deCalibracao, deCliente,
  deContato, deConvenio, deCurva, deEnsaio, deEquipamento, deGrupo, deInteracao,
  deItemCadastro, deItemEstoque, deLaudo, deLegenda, deLeituraPh, deLote,
  deLoteReagente, deMembro, deMetodologia, deMovimentoEstoque, deNotaFiscal,
  deOportunidade, deOrcamento, dePapel, deParametro, deRegistroCQ,
  deRegraDesconto, deTabelaPreco, deTipoAnalise, deTitulo, deUnidade,
  paraAmostra, paraCalibracao, paraCliente, paraCurva, paraEnsaio, paraLegenda,
  paraLeituraPh, paraLote, paraMembro, paraMovimentoEstoque, paraNotaFiscal,
  paraPapel, paraRegistroCQ, paraTitulo,
} from './mapas';
import type {
  LinhaAmostra, LinhaAmostraControle, LinhaAuditoria, LinhaBandeja,
  LinhaCalibracao, LinhaCliente, LinhaContato, LinhaConvenio, LinhaCurva,
  LinhaEnsaio, LinhaEquipamento, LinhaGrupo, LinhaInteracao, LinhaItemCadastro,
  LinhaItemEstoque, LinhaLaudo, LinhaLegenda, LinhaLeituraPh, LinhaLote,
  LinhaLoteReagente, LinhaMembro, LinhaMetodologia, LinhaMovimentoEstoque,
  LinhaNotaFiscal, LinhaOportunidade, LinhaOrcamento, LinhaPapel, LinhaParametro,
  LinhaRegistroCQ, LinhaRegraDesconto, LinhaTabelaPreco, LinhaTipoAnalise,
  LinhaTitulo, LinhaUnidade,
} from './mapas';
import type {
  Amostra, AmostraControle, Bandeja, Calibracao, Cliente, Contato, Convenio,
  Curva, Ensaio, Equipamento, GrupoAnalise, Interacao, ItemEstoque, ItemSimples,
  Laudo, Legenda, LeituraPh, LoteReagente, LoteRecepcao, Metodologia,
  MovimentoEstoque, NotaFiscal, Oportunidade, Orcamento, Papel, Parametro,
  RegistroAuditoria, RegistroCQ, RegraDesconto, StatusAmostra, TabelaPreco,
  TipoAnalise, Titulo, Unidade, Usuario, UUID,
} from '../types';

/** Teto de amostras trazidas na carga inicial, das mais recentes para trás. */
const TETO_AMOSTRAS = 5000;
/** A trilha de auditoria é permanente; a tela mostra o período recente. */
const TETO_AUDITORIA = 2000;
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
  contatos: Contato[];
  oportunidades: Oportunidade[];
  interacoes: Interacao[];
  amostrasControle: AmostraControle[];
  registrosCQ: RegistroCQ[];
  laudos: Laudo[];
  orcamentos: Orcamento[];
  notasFiscais: NotaFiscal[];
  titulos: Titulo[];
  itensEstoque: ItemEstoque[];
  lotesReagente: LoteReagente[];
  movimentosEstoque: MovimentoEstoque[];
  auditoria: RegistroAuditoria[];
  tiposAnalise: TipoAnalise[];
  curvas: Curva[];
  legendas: Legenda[];
  metodologias: Metodologia[];
  bandejas: Bandeja[];
  profundidades: ItemSimples[];
  culturas: ItemSimples[];
  tiposCliente: ItemSimples[];
  observacoesFixas: ItemSimples[];
  convenios: Convenio[];
  regrasDesconto: RegraDesconto[];
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

  const [
    contatos, oportunidades, interacoes, controles, registrosCQ, linhasLaudo,
    vinculosLaudo, orcamentos, linhasNota, vinculosNota, titulos,
  ] = await Promise.all([
    tudo<LinhaContato>('lab_contatos', '*'),
    tudo<LinhaOportunidade>('lab_oportunidades', '*', { coluna: 'ultima_interacao', crescente: false }),
    tudo<LinhaInteracao>('lab_interacoes', '*', { coluna: 'data', crescente: false }),
    tudo<LinhaAmostraControle>('lab_amostras_controle', '*', { coluna: 'nome' }),
    tudo<LinhaRegistroCQ>('lab_registros_cq', '*', { coluna: 'data', crescente: false }),
    tudo<LinhaLaudo>('lab_laudos', '*', { coluna: 'criado_em', crescente: false }),
    tudo<{ laudo_id: string; amostra_id: string }>('lab_laudos_amostras', '*'),
    tudo<LinhaOrcamento>('lab_orcamentos', '*', { coluna: 'emitido_em', crescente: false }),
    tudo<LinhaNotaFiscal>('lab_notas_fiscais', '*', { coluna: 'emissao', crescente: false }),
    tudo<{ nota_id: string; laudo_id: string }>('lab_notas_laudos', '*'),
    tudo<LinhaTitulo>('lab_titulos', '*', { coluna: 'vencimento' }),
  ]);

  const [
    itensEstoque, lotesReagente, movimentos, auditoria, linhasTipo, vinculosTipo,
    curvas, legendas, metodologias, bandejas, itensCadastro, convenios, regras,
  ] = await Promise.all([
    tudo<LinhaItemEstoque>('lab_itens_estoque', '*', { coluna: 'nome' }),
    tudo<LinhaLoteReagente>('lab_lotes_reagente', '*', { coluna: 'validade' }),
    tudo<LinhaMovimentoEstoque>('lab_movimentos_estoque', '*', { coluna: 'data', crescente: false }),
    tudo<LinhaAuditoria>('lab_auditoria', '*', { coluna: 'data', crescente: false }, TETO_AUDITORIA),
    tudo<LinhaTipoAnalise>('lab_tipos_analise', '*', { coluna: 'codigo' }),
    tudo<{ tipo_id: string; parametro_id: string; ordem: number }>('lab_tipos_analise_parametros', '*'),
    tudo<LinhaCurva>('lab_curvas', '*', { coluna: 'data', crescente: false }),
    tudo<LinhaLegenda>('lab_legendas', '*', { coluna: 'codigo' }),
    tudo<LinhaMetodologia>('lab_metodologias', '*', { coluna: 'codigo' }),
    tudo<LinhaBandeja>('lab_bandejas', '*', { coluna: 'codigo' }),
    tudo<LinhaItemCadastro>('lab_itens_cadastro', '*', { coluna: 'codigo' }),
    tudo<LinhaConvenio>('lab_convenios', '*', { coluna: 'codigo' }),
    tudo<LinhaRegraDesconto>('lab_regras_desconto', '*', { coluna: 'quantidade_minima' }),
  ]);

  const agrupar = <T, C>(linhas: T[], chave: (l: T) => string, valor: (l: T) => C) => {
    const mapa = new Map<string, C[]>();
    for (const linha of linhas) {
      const lista = mapa.get(chave(linha)) ?? [];
      lista.push(valor(linha));
      mapa.set(chave(linha), lista);
    }
    return mapa;
  };

  const amostrasDoLaudo = agrupar(vinculosLaudo, (v) => v.laudo_id, (v) => v.amostra_id);
  const laudosDaNota = agrupar(vinculosNota, (v) => v.nota_id, (v) => v.laudo_id);
  const parametrosDoTipo = agrupar(
    [...vinculosTipo].sort((a, b) => a.ordem - b.ordem), (v) => v.tipo_id, (v) => v.parametro_id,
  );
  const daEspecie = (especie: string) =>
    itensCadastro.filter((i) => i.especie === especie).map(deItemCadastro);

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
    contatos: contatos.map(deContato),
    oportunidades: oportunidades.map(deOportunidade),
    interacoes: interacoes.map(deInteracao),
    amostrasControle: controles.map(deAmostraControle),
    registrosCQ: registrosCQ.map(deRegistroCQ),
    laudos: linhasLaudo.map((l) => deLaudo(l, amostrasDoLaudo.get(l.id) ?? [])),
    orcamentos: orcamentos.map(deOrcamento),
    notasFiscais: linhasNota.map((n) => deNotaFiscal(n, laudosDaNota.get(n.id) ?? [])),
    titulos: titulos.map(deTitulo),
    itensEstoque: itensEstoque.map(deItemEstoque),
    lotesReagente: lotesReagente.map(deLoteReagente),
    movimentosEstoque: movimentos.map(deMovimentoEstoque),
    auditoria: auditoria.map(deAuditoria),
    tiposAnalise: linhasTipo.map((t) => deTipoAnalise(t, parametrosDoTipo.get(t.id) ?? [])),
    curvas: curvas.map(deCurva),
    legendas: legendas.map(deLegenda),
    metodologias: metodologias.map(deMetodologia),
    bandejas: bandejas.map(deBandeja),
    profundidades: daEspecie('profundidade'),
    culturas: daEspecie('cultura'),
    tiposCliente: daEspecie('tipo-cliente'),
    observacoesFixas: daEspecie('observacao-fixa'),
    convenios: convenios.map(deConvenio),
    regrasDesconto: regras.map(deRegraDesconto),
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

/* ---------------- escrita — fase 2 ---------------- */

/** Monta o update parcial a partir do mapa campo→coluna. */
function parcialDe<T extends object>(
  dados: Partial<T>, colunas: Record<string, string>,
): Record<string, unknown> {
  const parcial: Record<string, unknown> = {};
  for (const [campo, coluna] of Object.entries(colunas)) {
    if (campo in dados) parcial[coluna] = (dados as Record<string, unknown>)[campo] ?? null;
  }
  return parcial;
}

const COLUNA_LAUDO: Record<string, string> = {
  status: 'status', emitidoEm: 'emitido_em', assinadoPorId: 'assinado_por_id',
  versao: 'versao', hashDocumento: 'hash_documento', enviadoEmail: 'enviado_email',
  observacoes: 'observacoes',
};

export async function gravarLaudo(laudoId: UUID, dados: Partial<Laudo>): Promise<void> {
  const parcial = parcialDe(dados, COLUNA_LAUDO);
  if (Object.keys(parcial).length === 0) return;
  const banco = exigirBanco();
  estourar('laudo', (await banco.from('lab_laudos').update(parcial).eq('id', laudoId)).error);
}

const COLUNA_TITULO: Record<string, string> = {
  status: 'status', pagamento: 'pagamento', valorPago: 'valor_pago',
  formaPagamento: 'forma_pagamento', vencimento: 'vencimento',
  notaFiscalId: 'nota_fiscal_id',
};

export async function gravarTitulo(tituloId: UUID, dados: Partial<Titulo>): Promise<void> {
  const parcial = parcialDe(dados, COLUNA_TITULO);
  if (Object.keys(parcial).length === 0) return;
  const banco = exigirBanco();
  estourar('título', (await banco.from('lab_titulos').update(parcial).eq('id', tituloId)).error);
}

/** A nota entra com os laudos que ela cobre; o título a receber vem junto. */
export async function gravarNota(
  nota: NotaFiscal, unidadeId: UUID, titulo?: Titulo,
): Promise<void> {
  const banco = exigirBanco();
  estourar('nota fiscal', (await banco.from('lab_notas_fiscais').insert(paraNotaFiscal(nota, unidadeId))).error);
  if (nota.laudoIds.length > 0) {
    estourar('laudos da nota', (await banco.from('lab_notas_laudos').insert(
      nota.laudoIds.map((laudoId) => ({ nota_id: nota.id, laudo_id: laudoId })),
    )).error);
  }
  if (titulo) {
    estourar('título da nota', (await banco.from('lab_titulos').insert(paraTitulo(titulo))).error);
  }
}

export async function gravarEstagio(
  oportunidadeId: UUID, estagio: Oportunidade['estagio'],
): Promise<void> {
  const banco = exigirBanco();
  estourar('oportunidade', (await banco.from('lab_oportunidades').update({
    estagio, ultima_interacao: new Date().toISOString(),
  }).eq('id', oportunidadeId)).error);
}

/** O saldo do item é recalculado por gatilho; aqui só entra o movimento. */
export async function gravarMovimento(movimento: MovimentoEstoque): Promise<void> {
  const banco = exigirBanco();
  estourar('movimento de estoque',
    (await banco.from('lab_movimentos_estoque').insert(paraMovimentoEstoque(movimento))).error);
}

/**
 * Edição de membro. Criar conta é outro ato — o vínculo com `auth.users`
 * nasce no convite —, então aqui só se altera quem já existe.
 */
export async function gravarUsuario(usuario: Usuario): Promise<void> {
  const banco = exigirBanco();
  const { error, count } = await banco.from('lab_membros')
    .update(paraMembro(usuario), { count: 'exact' }).eq('id', usuario.id);
  estourar('membro', error);
  if (count === 0) {
    throw new Error(
      'Este membro ainda não existe no banco. Convide a conta pelo painel de ' +
      'autenticação e vincule em lab_membros antes de editar o cadastro.',
    );
  }
  estourar('unidades do membro',
    (await banco.from('lab_membros_unidades').delete().eq('membro_id', usuario.id)).error);
  if (usuario.unidadeIds.length > 0) {
    estourar('unidades do membro', (await banco.from('lab_membros_unidades').insert(
      usuario.unidadeIds.map((unidadeId) => ({ membro_id: usuario.id, unidade_id: unidadeId })),
    )).error);
  }
}

export async function gravarPapel(papel: Papel): Promise<void> {
  const banco = exigirBanco();
  estourar('papel', (await banco.from('lab_papeis').upsert(paraPapel(papel))).error);
}

export async function gravarCliente(cliente: Cliente): Promise<void> {
  const banco = exigirBanco();
  estourar('cliente', (await banco.from('lab_clientes').upsert(paraCliente(cliente))).error);
}

export async function gravarCurva(curva: Curva): Promise<void> {
  const banco = exigirBanco();
  estourar('curva', (await banco.from('lab_curvas').upsert(paraCurva(curva))).error);
}

export async function gravarLegenda(legenda: Legenda): Promise<void> {
  const banco = exigirBanco();
  estourar('legenda', (await banco.from('lab_legendas').upsert(paraLegenda(legenda))).error);
}

export async function gravarRegistroCQ(registro: RegistroCQ): Promise<void> {
  const banco = exigirBanco();
  estourar('registro de CQ', (await banco.from('lab_registros_cq').insert(paraRegistroCQ(registro))).error);
}

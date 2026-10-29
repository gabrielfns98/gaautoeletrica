/* ============================================================
   BANCADA — tradução entre as linhas do banco e o domínio
   O banco fala snake_case e guarda data como timestamptz; as
   telas falam camelCase. A tradução mora inteira aqui para que
   um nome de coluna errado apareça num lugar só — e para que o
   teste de esquema consiga conferi-la contra a migração.
   ============================================================ */

import type {
  Amostra, Calibracao, Cliente, Ensaio, Equipamento, GrupoAnalise, LeituraPh,
  LoteRecepcao, Papel, Parametro, Permissao, PontoCalibracao, PontoTrace,
  Prioridade, StatusAmostra, StatusCalibracao, StatusEnsaio, TabelaPreco,
  Unidade, Usuario, UUID,
} from '../types';

/* ---------------- auxiliares ---------------- */

const num = (v: unknown): number | undefined =>
  v === null || v === undefined || v === '' ? undefined : Number(v);

const num0 = (v: unknown): number => num(v) ?? 0;

const txt = (v: unknown): string => (v === null || v === undefined ? '' : String(v));

const opc = (v: unknown): string | undefined =>
  v === null || v === undefined || v === '' ? undefined : String(v);

/** Iniciais do nome, que o banco não guarda por ser derivável. */
export const iniciaisDe = (nome: string): string =>
  nome.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');

/* ---------------- linhas ---------------- */

export interface LinhaUnidade {
  id: string; codigo: string; sigla: string; nome: string; cnpj: string;
  municipio: string; uf: string; responsavel_tecnico: string;
  crq: string | null; acreditacao: string | null;
}

export interface LinhaPapel {
  id: string; nome: string; descricao: string | null; sistema: boolean;
  cor: string; permissoes: string[];
}

export interface LinhaMembro {
  id: string; user_id: string; papel_id: string; nome: string; email: string;
  cargo: string | null; ativo: boolean; mfa: boolean; habilitacoes: string[];
  ultimo_acesso: string | null;
}

export interface LinhaGrupo {
  id: string; nome: string; abreviacao: string; descricao: string | null;
  prazo_padrao_dias: number; tem_ph: boolean; ativo: boolean;
}

export interface LinhaParametro {
  id: string; codigo: string; nome: string; grupo_id: string;
  unidade_medida: string; metodo: string; casas_decimais: number;
  limite_inferior: number | null; limite_superior: number | null;
  incerteza: number | null; preco: number; ativo: boolean; eh_ph: boolean;
  extrator: string | null; proporcao: string | null;
}

export interface LinhaTabelaPreco {
  id: string; nome: string; desconto: number; ativa: boolean;
}

export interface LinhaCliente {
  id: string; codigo: string; nome: string; nome_fantasia: string | null;
  tipo: string; documento: string; inscricao_estadual: string | null;
  email: string | null; telefone: string | null; cep: string | null;
  logradouro: string | null; municipio: string; uf: string;
  segmento: string | null; consultor_id: string | null;
  tabela_preco_id: string | null; limite_credito: number;
  condicao_pagamento: string | null; ativo: boolean;
  observacoes: string | null; criado_em: string;
}

export interface LinhaLote {
  id: string; numero: string; cliente_id: string; unidade_id: string;
  data_recepcao: string; recebido_por_id: string | null;
  quantidade_amostras: number; nota_fiscal_remessa: string | null;
  transportadora: string | null; observacoes: string | null;
}

export interface LinhaAmostra {
  id: string; protocolo: string; lote_recepcao_id: string; cliente_id: string;
  grupo_id: string; unidade_id: string; identificacao_campo: string;
  fazenda: string | null; talhao: string | null; profundidade: string | null;
  cultura: string | null; data_coleta: string | null; data_recepcao: string;
  prazo_entrega: string; status: string; prioridade: string;
  massa_recebida: number | null; temperatura_recebimento: number | null;
  conforme_no_recebimento: boolean; nao_conformidade: string | null;
  posicao_bandeja: string | null; observacoes: string | null;
}

export interface LinhaEnsaio {
  id: string; amostra_id: string; parametro_id: string; status: string;
  valor: number | null; valor_texto: string | null; unidade_medida: string;
  analista_id: string | null; revisor_id: string | null;
  data_leitura: string | null; data_aprovacao: string | null;
  leitura_ph_id: string | null; fora_de_faixa: boolean; observacao: string | null;
}

export interface LinhaEquipamento {
  id: string; tag: string; nome: string; fabricante: string | null;
  modelo: string | null; numero_serie: string | null; tipo: string;
  unidade_id: string; setor: string | null; protocolo: string | null;
  baud_rate: number | null; ativo: boolean; data_aquisicao: string | null;
  proxima_manutencao: string | null; eletrodo_modelo: string | null;
  eletrodo_serie: string | null; eletrodo_instalado_em: string | null;
  eletrodo_vida_util_meses: number | null;
}

export interface LinhaCalibracao {
  id: string; equipamento_id: string; analista_id: string | null; data: string;
  pontos: PontoCalibracao[]; slope_percentual: number; slope_mv_por_ph: number;
  offset_mv: number; r2: number; status: string; valida_ate: string;
  observacao: string | null;
}

export interface LinhaLeituraPh {
  id: string; ensaio_id: string; amostra_id: string; parametro_id: string;
  equipamento_id: string; calibracao_id: string; analista_id: string | null;
  origem: string; mv: number; temperatura: number; ph_bruto: number;
  ph_corrigido: number; deriva_mv_por_min: number; estavel: boolean;
  tempo_estabilizacao_s: number; extrator: string; proporcao: string | null;
  data_hora: string; trace: PontoTrace[] | null; replica_de: string | null;
  observacao: string | null;
}

/* ---------------- banco → domínio ---------------- */

export const deUnidade = (l: LinhaUnidade): Unidade => ({
  id: l.id, codigo: l.codigo, sigla: l.sigla, nome: l.nome, cnpj: l.cnpj,
  municipio: l.municipio, uf: l.uf, responsavelTecnico: l.responsavel_tecnico,
  crq: txt(l.crq), acreditacao: opc(l.acreditacao),
});

export const dePapel = (l: LinhaPapel): Papel => ({
  id: l.id, nome: l.nome, descricao: txt(l.descricao), sistema: l.sistema,
  permissoes: l.permissoes as Permissao[], cor: l.cor,
});

export const deMembro = (l: LinhaMembro, unidadeIds: UUID[]): Usuario => ({
  id: l.id, nome: l.nome, email: l.email, cargo: txt(l.cargo), papelId: l.papel_id,
  unidadeIds, ativo: l.ativo, ultimoAcesso: opc(l.ultimo_acesso),
  iniciais: iniciaisDe(l.nome), habilitacoes: l.habilitacoes as Usuario['habilitacoes'],
  mfa: l.mfa,
});

export const deGrupo = (l: LinhaGrupo): GrupoAnalise => ({
  id: l.id as GrupoAnalise['id'], nome: l.nome, abreviacao: l.abreviacao,
  descricao: txt(l.descricao), prazoPadraoDias: l.prazo_padrao_dias,
  temPh: l.tem_ph, ativo: l.ativo,
});

export const deParametro = (l: LinhaParametro): Parametro => ({
  id: l.id, codigo: l.codigo, nome: l.nome, grupoId: l.grupo_id as Parametro['grupoId'],
  unidade: txt(l.unidade_medida), tipo: 'numerico', metodo: l.metodo,
  casasDecimais: l.casas_decimais, limiteInferior: num(l.limite_inferior),
  limiteSuperior: num(l.limite_superior), incerteza: num(l.incerteza),
  preco: num0(l.preco), ativo: l.ativo, ehPh: l.eh_ph,
  extrator: (opc(l.extrator) as Parametro['extrator']), proporcao: opc(l.proporcao),
});

export const deTabelaPreco = (l: LinhaTabelaPreco): TabelaPreco => ({
  id: l.id, nome: l.nome, desconto: num0(l.desconto), ativa: l.ativa,
});

export const deCliente = (l: LinhaCliente): Cliente => ({
  id: l.id, codigo: l.codigo, nome: l.nome, nomeFantasia: opc(l.nome_fantasia),
  tipo: l.tipo as Cliente['tipo'], documento: l.documento,
  inscricaoEstadual: opc(l.inscricao_estadual), email: txt(l.email),
  telefone: txt(l.telefone), municipio: l.municipio, uf: l.uf, cep: txt(l.cep),
  logradouro: txt(l.logradouro), segmento: txt(l.segmento),
  consultorId: opc(l.consultor_id), tabelaPrecoId: txt(l.tabela_preco_id),
  limiteCredito: num0(l.limite_credito), condicaoPagamento: txt(l.condicao_pagamento),
  ativo: l.ativo, criadoEm: l.criado_em, observacoes: opc(l.observacoes),
});

export const deLote = (l: LinhaLote): LoteRecepcao => ({
  id: l.id, numero: l.numero, clienteId: l.cliente_id,
  dataRecepcao: l.data_recepcao, recebidoPorId: txt(l.recebido_por_id),
  quantidadeAmostras: l.quantidade_amostras,
  notaFiscalRemessa: opc(l.nota_fiscal_remessa),
  transportadora: opc(l.transportadora), observacoes: opc(l.observacoes),
});

export const deAmostra = (l: LinhaAmostra): Amostra => ({
  id: l.id, protocolo: l.protocolo, loteRecepcaoId: l.lote_recepcao_id,
  clienteId: l.cliente_id, grupoId: l.grupo_id as Amostra['grupoId'],
  unidadeId: l.unidade_id, identificacaoCampo: l.identificacao_campo,
  fazenda: opc(l.fazenda), talhao: opc(l.talhao), profundidade: opc(l.profundidade),
  cultura: opc(l.cultura), dataColeta: txt(l.data_coleta),
  dataRecepcao: l.data_recepcao, prazoEntrega: l.prazo_entrega,
  status: l.status as StatusAmostra, prioridade: l.prioridade as Prioridade,
  massaRecebida: num(l.massa_recebida),
  temperaturaRecebimento: num(l.temperatura_recebimento),
  conformeNoRecebimento: l.conforme_no_recebimento,
  naoConformidade: opc(l.nao_conformidade), posicaoBandeja: opc(l.posicao_bandeja),
  observacoes: opc(l.observacoes),
});

export const deEnsaio = (l: LinhaEnsaio): Ensaio => ({
  id: l.id, amostraId: l.amostra_id, parametroId: l.parametro_id,
  status: l.status as StatusEnsaio, valor: num(l.valor),
  valorTexto: opc(l.valor_texto), unidade: txt(l.unidade_medida),
  analistaId: opc(l.analista_id), revisorId: opc(l.revisor_id),
  dataLeitura: opc(l.data_leitura), dataAprovacao: opc(l.data_aprovacao),
  leituraPhId: opc(l.leitura_ph_id), observacao: opc(l.observacao),
  foraDeFaixa: l.fora_de_faixa,
});

export const deEquipamento = (l: LinhaEquipamento): Equipamento => ({
  id: l.id, tag: l.tag, nome: l.nome, fabricante: txt(l.fabricante),
  modelo: txt(l.modelo), numeroSerie: txt(l.numero_serie),
  tipo: l.tipo as Equipamento['tipo'], unidadeId: l.unidade_id,
  setor: txt(l.setor), protocolo: opc(l.protocolo) as Equipamento['protocolo'],
  baudRate: num(l.baud_rate), ativo: l.ativo,
  dataAquisicao: txt(l.data_aquisicao), proximaManutencao: txt(l.proxima_manutencao),
  eletrodo: l.eletrodo_modelo
    ? {
        id: l.id,
        modelo: l.eletrodo_modelo,
        numeroSerie: txt(l.eletrodo_serie),
        dataInstalacao: txt(l.eletrodo_instalado_em),
        vidaUtilMeses: num0(l.eletrodo_vida_util_meses),
      }
    : undefined,
});

export const deCalibracao = (l: LinhaCalibracao): Calibracao => ({
  id: l.id, equipamentoId: l.equipamento_id, analistaId: txt(l.analista_id),
  data: l.data, pontos: l.pontos ?? [], slopePercentual: num0(l.slope_percentual),
  offsetMv: num0(l.offset_mv), slopeMvPorPh: num0(l.slope_mv_por_ph),
  r2: num0(l.r2), status: l.status as StatusCalibracao, validaAte: l.valida_ate,
  observacao: opc(l.observacao),
});

export const deLeituraPh = (l: LinhaLeituraPh): LeituraPh => ({
  id: l.id, ensaioId: l.ensaio_id, amostraId: l.amostra_id,
  parametroId: l.parametro_id, equipamentoId: l.equipamento_id,
  calibracaoId: l.calibracao_id, analistaId: txt(l.analista_id),
  origem: l.origem as LeituraPh['origem'], mV: num0(l.mv),
  temperatura: num0(l.temperatura), phBruto: num0(l.ph_bruto),
  phCorrigido: num0(l.ph_corrigido), derivaMvPorMin: num0(l.deriva_mv_por_min),
  estavel: l.estavel, tempoEstabilizacaoS: l.tempo_estabilizacao_s,
  extrator: l.extrator as LeituraPh['extrator'], proporcao: txt(l.proporcao),
  dataHora: l.data_hora, trace: l.trace ?? undefined,
  replicaDe: opc(l.replica_de), observacao: opc(l.observacao),
});

/* ---------------- domínio → banco ---------------- */

export const paraLote = (l: LoteRecepcao, unidadeId: UUID): LinhaLote => ({
  id: l.id, numero: l.numero, cliente_id: l.clienteId, unidade_id: unidadeId,
  data_recepcao: l.dataRecepcao, recebido_por_id: l.recebidoPorId || null,
  quantidade_amostras: l.quantidadeAmostras,
  nota_fiscal_remessa: l.notaFiscalRemessa ?? null,
  transportadora: l.transportadora ?? null, observacoes: l.observacoes ?? null,
});

export const paraAmostra = (a: Amostra): LinhaAmostra => ({
  id: a.id, protocolo: a.protocolo, lote_recepcao_id: a.loteRecepcaoId,
  cliente_id: a.clienteId, grupo_id: a.grupoId, unidade_id: a.unidadeId,
  identificacao_campo: a.identificacaoCampo, fazenda: a.fazenda ?? null,
  talhao: a.talhao ?? null, profundidade: a.profundidade ?? null,
  cultura: a.cultura ?? null, data_coleta: a.dataColeta || null,
  data_recepcao: a.dataRecepcao, prazo_entrega: a.prazoEntrega,
  status: a.status, prioridade: a.prioridade,
  massa_recebida: a.massaRecebida ?? null,
  temperatura_recebimento: a.temperaturaRecebimento ?? null,
  conforme_no_recebimento: a.conformeNoRecebimento,
  nao_conformidade: a.naoConformidade ?? null,
  posicao_bandeja: a.posicaoBandeja ?? null, observacoes: a.observacoes ?? null,
});

export const paraEnsaio = (e: Ensaio): LinhaEnsaio => ({
  id: e.id, amostra_id: e.amostraId, parametro_id: e.parametroId,
  status: e.status, valor: e.valor ?? null, valor_texto: e.valorTexto ?? null,
  unidade_medida: e.unidade, analista_id: e.analistaId ?? null,
  revisor_id: e.revisorId ?? null, data_leitura: e.dataLeitura ?? null,
  data_aprovacao: e.dataAprovacao ?? null, leitura_ph_id: e.leituraPhId ?? null,
  fora_de_faixa: e.foraDeFaixa ?? false, observacao: e.observacao ?? null,
});

export const paraCalibracao = (c: Calibracao): LinhaCalibracao => ({
  id: c.id, equipamento_id: c.equipamentoId, analista_id: c.analistaId || null,
  data: c.data, pontos: c.pontos, slope_percentual: c.slopePercentual,
  slope_mv_por_ph: c.slopeMvPorPh, offset_mv: c.offsetMv, r2: c.r2,
  status: c.status, valida_ate: c.validaAte, observacao: c.observacao ?? null,
});

export const paraLeituraPh = (l: LeituraPh): LinhaLeituraPh => ({
  id: l.id, ensaio_id: l.ensaioId, amostra_id: l.amostraId,
  parametro_id: l.parametroId, equipamento_id: l.equipamentoId,
  calibracao_id: l.calibracaoId, analista_id: l.analistaId || null,
  origem: l.origem, mv: l.mV, temperatura: l.temperatura, ph_bruto: l.phBruto,
  ph_corrigido: l.phCorrigido, deriva_mv_por_min: l.derivaMvPorMin,
  estavel: l.estavel, tempo_estabilizacao_s: l.tempoEstabilizacaoS,
  extrator: l.extrator, proporcao: l.proporcao || null, data_hora: l.dataHora,
  trace: l.trace ?? null, replica_de: l.replicaDe ?? null,
  observacao: l.observacao ?? null,
});

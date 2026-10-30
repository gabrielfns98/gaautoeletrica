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
  ModeloImportacao, TipoEquipamento, VerificacaoEquipamento,
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

/* ============================================================
   Fase 2 — CRM, qualidade, laudos, financeiro, fiscal, estoque,
   auditoria e os cadastros de referência.
   ============================================================ */

import type {
  AmostraControle, Bandeja, Contato, Convenio, Curva, FaixaLegenda, Interacao,
  ItemEstoque, ItemOrcamento, ItemSimples, Laudo, Legenda, LoteReagente,
  Metodologia, MovimentoEstoque, NotaFiscal, Oportunidade, Orcamento,
  PontoCurva, RegistroAuditoria, RegistroCQ, RegraDesconto, ResultadoCQ,
  StatusLaudo, StatusNota, StatusOrcamento, StatusTitulo, TipoAnalise,
  TipoTitulo, Titulo,
} from '../types';

/* ---------------- linhas ---------------- */

export interface LinhaContato {
  id: string; cliente_id: string; nome: string; cargo: string | null;
  email: string | null; telefone: string | null; principal: boolean;
}

export interface LinhaOportunidade {
  id: string; titulo: string; cliente_id: string; estagio: string; valor: number;
  probabilidade: number; previsao_fechamento: string | null;
  responsavel_id: string | null; origem: string | null; notas: string | null;
  criada_em: string; ultima_interacao: string;
}

export interface LinhaInteracao {
  id: string; cliente_id: string; oportunidade_id: string | null; tipo: string;
  resumo: string; data: string; autor_id: string | null;
}

export interface LinhaAmostraControle {
  id: string; nome: string; tipo: string; valor_alvo: number;
  desvio_padrao: number; lote: string | null; validade: string | null;
  grupo_id: string | null;
}

export interface LinhaRegistroCQ {
  id: string; controle_id: string; equipamento_id: string | null;
  analista_id: string | null; data: string; valor_medido: number;
  z_score: number; resultado: string; regra_violada: string | null;
}

export interface LinhaLaudo {
  id: string; numero: string; cliente_id: string; grupo_id: string | null;
  status: string; emitido_em: string | null; assinado_por_id: string | null;
  versao: number; hash_documento: string | null; enviado_email: boolean;
  observacoes: string | null;
}

export interface LinhaOrcamento {
  id: string; numero: string; cliente_id: string; oportunidade_id: string | null;
  status: string; emitido_em: string; valido_ate: string | null;
  itens: ItemOrcamento[]; desconto: number; total: number;
  responsavel_id: string | null;
}

export interface LinhaNotaFiscal {
  id: string; modelo: string; numero: string; serie: string; cliente_id: string;
  unidade_id: string | null; emissao: string; competencia: string; status: string;
  codigo_servico: string; discriminacao: string; valor_servicos: number;
  deducoes: number; base_calculo: number; aliquota_iss: number; valor_iss: number;
  iss_retido: boolean; valor_ir: number; valor_pis: number; valor_cofins: number;
  valor_csll: number; valor_inss: number; valor_liquido: number;
  chave_acesso: string | null; protocolo_autorizacao: string | null;
  motivo_rejeicao: string | null;
}

export interface LinhaTitulo {
  id: string; tipo: string; numero: string; cliente_id: string | null;
  fornecedor: string | null; descricao: string; categoria: string;
  emissao: string; vencimento: string; pagamento: string | null; valor: number;
  valor_pago: number; status: string; forma_pagamento: string | null;
  nota_fiscal_id: string | null;
}

export interface LinhaItemEstoque {
  id: string; codigo: string; nome: string; classe: string;
  fabricante: string | null; unidade_medida: string; saldo: number;
  estoque_minimo: number; localizacao: string | null; custo_unitario: number;
  controlado: boolean;
}

export interface LinhaLoteReagente {
  id: string; item_id: string; lote: string; validade: string;
  quantidade: number; certificado_url: string | null; aberto: boolean;
  aberto_em: string | null;
}

export interface LinhaMovimentoEstoque {
  id: string; item_id: string; lote_id: string | null; tipo: string;
  quantidade: number; data: string; usuario_id: string | null; motivo: string | null;
}

export interface LinhaAuditoria {
  id: number; data: string; usuario_id: string | null; acao: string;
  entidade: string; entidade_id: string | null; detalhe: string | null;
  ip: string | null;
}

export interface LinhaTipoAnalise {
  id: string; codigo: string; nome: string; grupo_id: string;
  prazo_dias: number; preco: number | null; ativo: boolean;
}

export interface LinhaCurva {
  id: string; codigo: string; nome: string; parametro_id: string;
  equipamento_id: string | null; tipo_ajuste: string; pontos: PontoCurva[];
  coef_angular: number; coef_linear: number; r2: number; lod: number | null;
  loq: number | null; diluicao: number; analista_id: string | null;
  data: string; valida_ate: string; ativa: boolean; observacao: string | null;
}

export interface LinhaLegenda {
  id: string; codigo: string; nome: string; parametro_id: string;
  cultura: string | null; fonte: string; faixas: FaixaLegenda[];
  padrao: boolean; ativa: boolean;
}

export interface LinhaMetodologia {
  id: string; codigo: string; nome: string; norma: string; versao: string;
  vigente_desde: string; ativa: boolean;
}

export interface LinhaBandeja {
  id: string; codigo: string; nome: string; linhas: number; colunas: number;
  setor: string | null; ativa: boolean;
}

export interface LinhaItemCadastro {
  id: string; especie: string; codigo: string; nome: string; ativo: boolean;
  observacao: string | null;
}

export interface LinhaConvenio {
  id: string; codigo: string; nome: string; ativo: boolean;
  observacao: string | null; tabela_preco_id: string | null; desconto: number;
  valido_ate: string | null;
}

export interface LinhaRegraDesconto {
  id: string; codigo: string; nome: string; ativo: boolean;
  observacao: string | null; quantidade_minima: number; percentual: number;
}

/* ---------------- banco → domínio ---------------- */

export const deContato = (l: LinhaContato): Contato => ({
  id: l.id, clienteId: l.cliente_id, nome: l.nome, cargo: txt(l.cargo),
  email: txt(l.email), telefone: txt(l.telefone), principal: l.principal,
});

export const deOportunidade = (l: LinhaOportunidade): Oportunidade => ({
  id: l.id, titulo: l.titulo, clienteId: l.cliente_id,
  estagio: l.estagio as Oportunidade['estagio'], valor: num0(l.valor),
  probabilidade: num0(l.probabilidade), previsaoFechamento: txt(l.previsao_fechamento),
  responsavelId: txt(l.responsavel_id), criadaEm: l.criada_em,
  ultimaInteracao: l.ultima_interacao, origem: txt(l.origem), notas: opc(l.notas),
});

export const deInteracao = (l: LinhaInteracao): Interacao => ({
  id: l.id, clienteId: l.cliente_id, oportunidadeId: opc(l.oportunidade_id),
  tipo: l.tipo as Interacao['tipo'], resumo: l.resumo, data: l.data,
  autorId: txt(l.autor_id),
});

export const deAmostraControle = (l: LinhaAmostraControle): AmostraControle => ({
  id: l.id, nome: l.nome, tipo: l.tipo as AmostraControle['tipo'],
  valorAlvo: num0(l.valor_alvo), desvioPadrao: num0(l.desvio_padrao),
  lote: txt(l.lote), validade: txt(l.validade),
  grupoId: (l.grupo_id ?? '') as AmostraControle['grupoId'],
});

export const deRegistroCQ = (l: LinhaRegistroCQ): RegistroCQ => ({
  id: l.id, controleId: l.controle_id, equipamentoId: txt(l.equipamento_id),
  analistaId: txt(l.analista_id), data: l.data, valorMedido: num0(l.valor_medido),
  zScore: num0(l.z_score), resultado: l.resultado as ResultadoCQ,
  regraViolada: opc(l.regra_violada),
});

export const deLaudo = (l: LinhaLaudo, amostraIds: UUID[]): Laudo => ({
  id: l.id, numero: l.numero, clienteId: l.cliente_id, amostraIds,
  grupoId: (l.grupo_id ?? '') as Laudo['grupoId'], status: l.status as StatusLaudo,
  emitidoEm: opc(l.emitido_em), assinadoPorId: opc(l.assinado_por_id),
  versao: l.versao, hashDocumento: opc(l.hash_documento),
  enviadoEmail: l.enviado_email, observacoes: opc(l.observacoes),
});

export const deOrcamento = (l: LinhaOrcamento): Orcamento => ({
  id: l.id, numero: l.numero, clienteId: l.cliente_id,
  oportunidadeId: opc(l.oportunidade_id), status: l.status as StatusOrcamento,
  emitidoEm: l.emitido_em, validoAte: txt(l.valido_ate), itens: l.itens ?? [],
  desconto: num0(l.desconto), total: num0(l.total),
  responsavelId: txt(l.responsavel_id),
});

export const deNotaFiscal = (l: LinhaNotaFiscal, laudoIds: UUID[]): NotaFiscal => ({
  id: l.id, modelo: l.modelo as NotaFiscal['modelo'], numero: l.numero,
  serie: l.serie, clienteId: l.cliente_id, emissao: l.emissao,
  competencia: l.competencia, status: l.status as StatusNota,
  codigoServico: l.codigo_servico, discriminacao: l.discriminacao,
  valorServicos: num0(l.valor_servicos), deducoes: num0(l.deducoes),
  baseCalculo: num0(l.base_calculo), aliquotaIss: num0(l.aliquota_iss),
  valorIss: num0(l.valor_iss), issRetido: l.iss_retido, valorIr: num0(l.valor_ir),
  valorPis: num0(l.valor_pis), valorCofins: num0(l.valor_cofins),
  valorCsll: num0(l.valor_csll), valorInss: num0(l.valor_inss),
  valorLiquido: num0(l.valor_liquido), chaveAcesso: opc(l.chave_acesso),
  protocoloAutorizacao: opc(l.protocolo_autorizacao),
  motivoRejeicao: opc(l.motivo_rejeicao), laudoIds,
});

export const deTitulo = (l: LinhaTitulo): Titulo => ({
  id: l.id, tipo: l.tipo as TipoTitulo, numero: l.numero,
  clienteId: opc(l.cliente_id), fornecedor: opc(l.fornecedor),
  descricao: l.descricao, categoria: l.categoria, emissao: l.emissao,
  vencimento: l.vencimento, pagamento: opc(l.pagamento), valor: num0(l.valor),
  valorPago: num0(l.valor_pago), status: l.status as StatusTitulo,
  formaPagamento: opc(l.forma_pagamento) as Titulo['formaPagamento'],
  notaFiscalId: opc(l.nota_fiscal_id),
});

export const deItemEstoque = (l: LinhaItemEstoque): ItemEstoque => ({
  id: l.id, codigo: l.codigo, nome: l.nome, classe: l.classe as ItemEstoque['classe'],
  fabricante: txt(l.fabricante), unidadeMedida: l.unidade_medida,
  saldo: num0(l.saldo), estoqueMinimo: num0(l.estoque_minimo),
  localizacao: txt(l.localizacao), custoUnitario: num0(l.custo_unitario),
  controlado: l.controlado,
});

export const deLoteReagente = (l: LinhaLoteReagente): LoteReagente => ({
  id: l.id, itemId: l.item_id, lote: l.lote, validade: l.validade,
  quantidade: num0(l.quantidade), certificadoUrl: opc(l.certificado_url),
  aberto: l.aberto, abertoEm: opc(l.aberto_em),
});

export const deMovimentoEstoque = (l: LinhaMovimentoEstoque): MovimentoEstoque => ({
  id: l.id, itemId: l.item_id, loteId: opc(l.lote_id),
  tipo: l.tipo as MovimentoEstoque['tipo'], quantidade: num0(l.quantidade),
  data: l.data, usuarioId: txt(l.usuario_id), motivo: txt(l.motivo),
});

export const deAuditoria = (l: LinhaAuditoria): RegistroAuditoria => ({
  id: String(l.id), data: l.data, usuarioId: txt(l.usuario_id), acao: l.acao,
  entidade: l.entidade, entidadeId: txt(l.entidade_id), detalhe: txt(l.detalhe),
  ip: opc(l.ip),
});

export const deTipoAnalise = (l: LinhaTipoAnalise, parametroIds: UUID[]): TipoAnalise => ({
  id: l.id, codigo: l.codigo, nome: l.nome,
  grupoId: l.grupo_id as TipoAnalise['grupoId'], parametroIds,
  prazoDias: l.prazo_dias, preco: num(l.preco), ativo: l.ativo,
});

export const deCurva = (l: LinhaCurva): Curva => ({
  id: l.id, codigo: l.codigo, nome: l.nome, parametroId: l.parametro_id,
  equipamentoId: opc(l.equipamento_id), tipoAjuste: l.tipo_ajuste as Curva['tipoAjuste'],
  pontos: l.pontos ?? [], coefAngular: num0(l.coef_angular),
  coefLinear: num0(l.coef_linear), r2: num0(l.r2), lod: num(l.lod), loq: num(l.loq),
  diluicao: num0(l.diluicao) || 1, analistaId: opc(l.analista_id), data: l.data,
  validaAte: l.valida_ate, ativa: l.ativa, observacao: opc(l.observacao),
});

export const deLegenda = (l: LinhaLegenda): Legenda => ({
  id: l.id, codigo: l.codigo, nome: l.nome, parametroId: l.parametro_id,
  cultura: opc(l.cultura), fonte: l.fonte, faixas: l.faixas ?? [],
  padrao: l.padrao, ativa: l.ativa,
});

export const deMetodologia = (l: LinhaMetodologia): Metodologia => ({
  id: l.id, codigo: l.codigo, nome: l.nome, norma: l.norma, versao: l.versao,
  vigenteDesde: l.vigente_desde, ativa: l.ativa,
});

export const deBandeja = (l: LinhaBandeja): Bandeja => ({
  id: l.id, codigo: l.codigo, nome: l.nome, linhas: l.linhas,
  colunas: l.colunas, setor: txt(l.setor), ativa: l.ativa,
});

export const deItemCadastro = (l: LinhaItemCadastro): ItemSimples => ({
  id: l.id, codigo: l.codigo, nome: l.nome, ativo: l.ativo,
  observacao: opc(l.observacao),
});

export const deConvenio = (l: LinhaConvenio): Convenio => ({
  id: l.id, codigo: l.codigo, nome: l.nome, ativo: l.ativo,
  observacao: opc(l.observacao), tabelaPrecoId: opc(l.tabela_preco_id),
  desconto: num0(l.desconto), validoAte: opc(l.valido_ate),
});

export const deRegraDesconto = (l: LinhaRegraDesconto): RegraDesconto => ({
  id: l.id, codigo: l.codigo, nome: l.nome, ativo: l.ativo,
  observacao: opc(l.observacao), quantidadeMinima: l.quantidade_minima,
  percentual: num0(l.percentual),
});

/* ---------------- domínio → banco ---------------- */

export const paraCliente = (c: Cliente): LinhaCliente => ({
  id: c.id, codigo: c.codigo, nome: c.nome, nome_fantasia: c.nomeFantasia ?? null,
  tipo: c.tipo, documento: c.documento, inscricao_estadual: c.inscricaoEstadual ?? null,
  email: c.email || null, telefone: c.telefone || null, cep: c.cep || null,
  logradouro: c.logradouro || null, municipio: c.municipio, uf: c.uf,
  segmento: c.segmento || null, consultor_id: c.consultorId ?? null,
  tabela_preco_id: c.tabelaPrecoId || null, limite_credito: c.limiteCredito,
  condicao_pagamento: c.condicaoPagamento || null, ativo: c.ativo,
  observacoes: c.observacoes ?? null, criado_em: c.criadoEm,
});

/** Sem `user_id`: o vínculo com a conta de autenticação nasce no convite e
    nunca é reescrito por edição de cadastro. */
export const paraMembro = (u: Usuario): Omit<LinhaMembro, 'user_id'> => ({
  id: u.id, papel_id: u.papelId, nome: u.nome, email: u.email,
  cargo: u.cargo || null, ativo: u.ativo, mfa: u.mfa,
  habilitacoes: u.habilitacoes as unknown as string[],
  ultimo_acesso: u.ultimoAcesso ?? null,
});

export const paraPapel = (p: Papel): LinhaPapel => ({
  id: p.id, nome: p.nome, descricao: p.descricao || null, sistema: p.sistema,
  cor: p.cor, permissoes: p.permissoes as unknown as string[],
});

export const paraCurva = (c: Curva): LinhaCurva => ({
  id: c.id, codigo: c.codigo, nome: c.nome, parametro_id: c.parametroId,
  equipamento_id: c.equipamentoId ?? null, tipo_ajuste: c.tipoAjuste,
  pontos: c.pontos, coef_angular: c.coefAngular, coef_linear: c.coefLinear,
  r2: c.r2, lod: c.lod ?? null, loq: c.loq ?? null, diluicao: c.diluicao,
  analista_id: c.analistaId ?? null, data: c.data, valida_ate: c.validaAte,
  ativa: c.ativa, observacao: c.observacao ?? null,
});

export const paraLegenda = (l: Legenda): LinhaLegenda => ({
  id: l.id, codigo: l.codigo, nome: l.nome, parametro_id: l.parametroId,
  cultura: l.cultura ?? null, fonte: l.fonte, faixas: l.faixas,
  padrao: l.padrao, ativa: l.ativa,
});

export const paraRegistroCQ = (r: RegistroCQ): LinhaRegistroCQ => ({
  id: r.id, controle_id: r.controleId, equipamento_id: r.equipamentoId || null,
  analista_id: r.analistaId || null, data: r.data, valor_medido: r.valorMedido,
  z_score: r.zScore, resultado: r.resultado, regra_violada: r.regraViolada ?? null,
});

export const paraMovimentoEstoque = (m: MovimentoEstoque): LinhaMovimentoEstoque => ({
  id: m.id, item_id: m.itemId, lote_id: m.loteId ?? null, tipo: m.tipo,
  quantidade: m.quantidade, data: m.data, usuario_id: m.usuarioId || null,
  motivo: m.motivo || null,
});

export const paraNotaFiscal = (n: NotaFiscal, unidadeId: UUID): LinhaNotaFiscal => ({
  id: n.id, modelo: n.modelo, numero: n.numero, serie: n.serie,
  cliente_id: n.clienteId, unidade_id: unidadeId, emissao: n.emissao,
  competencia: n.competencia, status: n.status, codigo_servico: n.codigoServico,
  discriminacao: n.discriminacao, valor_servicos: n.valorServicos,
  deducoes: n.deducoes, base_calculo: n.baseCalculo, aliquota_iss: n.aliquotaIss,
  valor_iss: n.valorIss, iss_retido: n.issRetido, valor_ir: n.valorIr,
  valor_pis: n.valorPis, valor_cofins: n.valorCofins, valor_csll: n.valorCsll,
  valor_inss: n.valorInss, valor_liquido: n.valorLiquido,
  chave_acesso: n.chaveAcesso ?? null,
  protocolo_autorizacao: n.protocoloAutorizacao ?? null,
  motivo_rejeicao: n.motivoRejeicao ?? null,
});

export const paraTitulo = (t: Titulo): LinhaTitulo => ({
  id: t.id, tipo: t.tipo, numero: t.numero, cliente_id: t.clienteId ?? null,
  fornecedor: t.fornecedor ?? null, descricao: t.descricao, categoria: t.categoria,
  emissao: t.emissao, vencimento: t.vencimento, pagamento: t.pagamento ?? null,
  valor: t.valor, valor_pago: t.valorPago, status: t.status,
  forma_pagamento: t.formaPagamento ?? null, nota_fiscal_id: t.notaFiscalId ?? null,
});

/* ---------------- Importações ---------------- */

import type { Importacao } from '../types';

export interface LinhaImportacao {
  id: string; arquivo: string; hash: string; fluxo: string; linhas: number;
  gravados: number; usuario_id: string | null; unidade_id: string;
  data: string; reimportacao: boolean;
}

export interface LinhaImportacaoEnsaio {
  importacao_id: string; ensaio_id: string; valor: number;
}

export const deImportacao = (
  l: LinhaImportacao, itens: Importacao['itens'],
): Importacao => ({
  id: l.id, arquivo: l.arquivo, hash: l.hash,
  fluxo: l.fluxo as Importacao['fluxo'], linhas: l.linhas, gravados: l.gravados,
  usuarioId: txt(l.usuario_id), unidadeId: l.unidade_id, data: l.data,
  reimportacao: l.reimportacao, itens,
});

export const paraImportacao = (i: Importacao): LinhaImportacao => ({
  id: i.id, arquivo: i.arquivo, hash: i.hash, fluxo: i.fluxo, linhas: i.linhas,
  gravados: i.gravados, usuario_id: i.usuarioId || null, unidade_id: i.unidadeId,
  data: i.data, reimportacao: i.reimportacao,
});

/* ---------------- Cadastros editáveis: domínio → banco ---------------- */

export const paraUnidade = (u: Unidade): LinhaUnidade => ({
  id: u.id, codigo: u.codigo, sigla: u.sigla, nome: u.nome, cnpj: u.cnpj,
  municipio: u.municipio, uf: u.uf, responsavel_tecnico: u.responsavelTecnico,
  crq: u.crq || null, acreditacao: u.acreditacao ?? null,
});

export const paraGrupo = (g: GrupoAnalise): LinhaGrupo => ({
  id: g.id, nome: g.nome, abreviacao: g.abreviacao, descricao: g.descricao || null,
  prazo_padrao_dias: g.prazoPadraoDias, tem_ph: g.temPh, ativo: g.ativo,
});

export const paraParametro = (p: Parametro): LinhaParametro => ({
  id: p.id, codigo: p.codigo, nome: p.nome, grupo_id: p.grupoId,
  unidade_medida: p.unidade, metodo: p.metodo, casas_decimais: p.casasDecimais,
  limite_inferior: p.limiteInferior ?? null, limite_superior: p.limiteSuperior ?? null,
  incerteza: p.incerteza ?? null, preco: p.preco, ativo: p.ativo,
  eh_ph: p.ehPh ?? false, extrator: p.extrator ?? null, proporcao: p.proporcao ?? null,
});

export const paraTipoAnalise = (t: TipoAnalise): LinhaTipoAnalise => ({
  id: t.id, codigo: t.codigo, nome: t.nome, grupo_id: t.grupoId,
  prazo_dias: t.prazoDias, preco: t.preco ?? null, ativo: t.ativo,
});

export const paraMetodologia = (m: Metodologia): LinhaMetodologia => ({
  id: m.id, codigo: m.codigo, nome: m.nome, norma: m.norma, versao: m.versao,
  vigente_desde: m.vigenteDesde, ativa: m.ativa,
});

export const paraBandeja = (b: Bandeja): LinhaBandeja => ({
  id: b.id, codigo: b.codigo, nome: b.nome, linhas: b.linhas,
  colunas: b.colunas, setor: b.setor || null, ativa: b.ativa,
});

export const paraItemCadastro = (i: ItemSimples, especie: string): LinhaItemCadastro => ({
  id: i.id, especie, codigo: i.codigo, nome: i.nome, ativo: i.ativo,
  observacao: i.observacao ?? null,
});

export const paraConvenio = (c: Convenio): LinhaConvenio => ({
  id: c.id, codigo: c.codigo, nome: c.nome, ativo: c.ativo,
  observacao: c.observacao ?? null, tabela_preco_id: c.tabelaPrecoId ?? null,
  desconto: c.desconto, valido_ate: c.validoAte ?? null,
});

export const paraRegraDesconto = (r: RegraDesconto): LinhaRegraDesconto => ({
  id: r.id, codigo: r.codigo, nome: r.nome, ativo: r.ativo,
  observacao: r.observacao ?? null, quantidade_minima: r.quantidadeMinima,
  percentual: r.percentual,
});

/* ---------------- Critérios de aceitação ---------------- */

import type { CriterioAceitacao } from '../types';

export interface LinhaCriterio {
  id: string; nome: string; grupo_id: string | null; parametro_id: string | null;
  somente_ph: boolean; rsd_max_percentual: number; diferenca_max_percentual: number | null;
  z_score_max: number | null; slope_min: number | null; slope_max: number | null;
  slope_alerta: number | null; offset_max_mv: number | null; r2_min: number | null;
  deriva_max_mv_por_min: number | null; janela_estabilidade_s: number | null;
  ativo: boolean;
}

export const deCriterio = (l: LinhaCriterio): CriterioAceitacao => ({
  id: l.id, nome: l.nome,
  grupoId: (opc(l.grupo_id) as CriterioAceitacao['grupoId']),
  parametroId: opc(l.parametro_id), somentePh: l.somente_ph,
  rsdMaxPercentual: num0(l.rsd_max_percentual),
  diferencaMaxPercentual: num(l.diferenca_max_percentual),
  zScoreMax: num(l.z_score_max), slopeMin: num(l.slope_min), slopeMax: num(l.slope_max),
  slopeAlerta: num(l.slope_alerta), offsetMaxMv: num(l.offset_max_mv),
  r2Min: num(l.r2_min), derivaMaxMvPorMin: num(l.deriva_max_mv_por_min),
  janelaEstabilidadeS: num(l.janela_estabilidade_s), ativo: l.ativo,
});

export const paraCriterio = (c: CriterioAceitacao): LinhaCriterio => ({
  id: c.id, nome: c.nome, grupo_id: c.grupoId ?? null, parametro_id: c.parametroId ?? null,
  somente_ph: c.somentePh ?? false, rsd_max_percentual: c.rsdMaxPercentual,
  diferenca_max_percentual: c.diferencaMaxPercentual ?? null,
  z_score_max: c.zScoreMax ?? null, slope_min: c.slopeMin ?? null,
  slope_max: c.slopeMax ?? null, slope_alerta: c.slopeAlerta ?? null,
  offset_max_mv: c.offsetMaxMv ?? null, r2_min: c.r2Min ?? null,
  deriva_max_mv_por_min: c.derivaMaxMvPorMin ?? null,
  janela_estabilidade_s: c.janelaEstabilidadeS ?? null, ativo: c.ativo,
});

/* ---------------- Equipamentos: tipo, verificação e modelo ---------------- */

export interface LinhaTipoEquipamento {
  id: string; codigo: string; nome: string; grandeza: string;
  exige_curva: boolean; verificacao: string; periodicidade_dias: number;
  bloqueia_vencido: boolean; protocolos: string[] | null; ativo: boolean;
}

export const deTipoEquipamento = (l: LinhaTipoEquipamento): TipoEquipamento => ({
  id: l.id, codigo: l.codigo, nome: l.nome, grandeza: l.grandeza,
  exigeCurva: l.exige_curva, verificacao: l.verificacao as TipoEquipamento['verificacao'],
  periodicidadeDias: num0(l.periodicidade_dias), bloqueiaVencido: l.bloqueia_vencido,
  protocolos: l.protocolos ?? [], ativo: l.ativo,
});

export const paraTipoEquipamento = (t: TipoEquipamento): LinhaTipoEquipamento => ({
  id: t.id, codigo: t.codigo, nome: t.nome, grandeza: t.grandeza,
  exige_curva: t.exigeCurva, verificacao: t.verificacao,
  periodicidade_dias: t.periodicidadeDias, bloqueia_vencido: t.bloqueiaVencido,
  protocolos: t.protocolos, ativo: t.ativo,
});

export interface LinhaVerificacao {
  id: string; equipamento_id: string; forma: string; data: string; analista_id: string;
  valor_nominal: number | null; valor_medido: number | null;
  erro_percentual: number | null; r2: number | null;
  resultado: string; valida_ate: string; observacao: string | null;
}

export const deVerificacao = (l: LinhaVerificacao): VerificacaoEquipamento => ({
  id: l.id, equipamentoId: l.equipamento_id,
  forma: l.forma as VerificacaoEquipamento['forma'],
  data: l.data, analistaId: l.analista_id,
  valorNominal: num(l.valor_nominal), valorMedido: num(l.valor_medido),
  erroPercentual: num(l.erro_percentual), r2: num(l.r2),
  resultado: l.resultado as VerificacaoEquipamento['resultado'],
  validaAte: l.valida_ate, observacao: opc(l.observacao),
});

export const paraVerificacao = (v: VerificacaoEquipamento): LinhaVerificacao => ({
  id: v.id, equipamento_id: v.equipamentoId, forma: v.forma, data: v.data,
  analista_id: v.analistaId, valor_nominal: v.valorNominal ?? null,
  valor_medido: v.valorMedido ?? null, erro_percentual: v.erroPercentual ?? null,
  r2: v.r2 ?? null, resultado: v.resultado, valida_ate: v.validaAte,
  observacao: v.observacao ?? null,
});

export interface LinhaModeloImportacao {
  id: string; nome: string; equipamento_id: string | null; tipo_equipamento_id: string | null;
  fluxo: string; separador: string | null; linhas_ignoradas: number;
  tem_cabecalho: boolean; decimal_virgula: boolean;
  por_titulo: Record<string, string> | null; por_indice: Record<string, string> | null;
  ativo: boolean; criado_por_id: string | null; data: string;
}

export const deModeloImportacao = (l: LinhaModeloImportacao): ModeloImportacao => ({
  id: l.id, nome: l.nome,
  equipamentoId: opc(l.equipamento_id), tipoEquipamentoId: opc(l.tipo_equipamento_id),
  fluxo: l.fluxo as ModeloImportacao['fluxo'], separador: opc(l.separador),
  linhasIgnoradas: num0(l.linhas_ignoradas), temCabecalho: l.tem_cabecalho,
  decimalVirgula: l.decimal_virgula,
  porTitulo: l.por_titulo ?? {},
  // O JSON volta com chave em texto; o índice é número no código.
  porIndice: l.por_indice
    ? Object.fromEntries(Object.entries(l.por_indice).map(([k, v]) => [Number(k), v]))
    : undefined,
  ativo: l.ativo, criadoPorId: opc(l.criado_por_id), data: l.data,
});

export const paraModeloImportacao = (m: ModeloImportacao): LinhaModeloImportacao => ({
  id: m.id, nome: m.nome, equipamento_id: m.equipamentoId ?? null,
  tipo_equipamento_id: m.tipoEquipamentoId ?? null, fluxo: m.fluxo,
  separador: m.separador ?? null, linhas_ignoradas: m.linhasIgnoradas,
  tem_cabecalho: m.temCabecalho, decimal_virgula: m.decimalVirgula,
  por_titulo: m.porTitulo,
  por_indice: m.porIndice
    ? Object.fromEntries(Object.entries(m.porIndice).map(([k, v]) => [String(k), v]))
    : null,
  ativo: m.ativo, criado_por_id: m.criadoPorId ?? null, data: m.data,
});

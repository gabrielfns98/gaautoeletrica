/* ============================================================
   BANCADA — modelo de domínio
   Laboratório de análises agroindustriais (solo, foliar, água,
   fertilizantes, sementes...) com módulo central de pH.
   ============================================================ */

export type UUID = string;
export type ISODate = string;

/* ---------------- Organização / multiempresa ---------------- */

export interface Unidade {
  id: UUID;
  codigo: string;            // "13"
  sigla: string;             // "LEM/BA"
  nome: string;              // "LABORATÓRIO SOLOS & PLANTAS"
  cnpj: string;
  municipio: string;
  uf: string;
  responsavelTecnico: string;
  crq: string;               // registro do conselho de química
  acreditacao?: string;      // ISO/IEC 17025, RBLE/MAPA...
}

/* ---------------- Permissões ---------------- */

export const MODULOS = [
  'dashboard', 'recepcao', 'amostras', 'ph', 'analises', 'laudos',
  'crm', 'financeiro', 'fiscal', 'estoque', 'equipamentos',
  'usuarios', 'configuracoes', 'auditoria',
] as const;
export type Modulo = (typeof MODULOS)[number];

export const ACOES = ['ver', 'criar', 'editar', 'excluir', 'aprovar', 'exportar'] as const;
export type Acao = (typeof ACOES)[number];

export type Permissao = `${Modulo}:${Acao}`;

export interface Papel {
  id: UUID;
  nome: string;
  descricao: string;
  sistema: boolean;             // papéis de sistema não podem ser excluídos
  permissoes: Permissao[];
  cor: string;                  // token hsl
}

export interface Usuario {
  id: UUID;
  nome: string;
  email: string;
  cargo: string;
  papelId: UUID;
  unidadeIds: UUID[];
  ativo: boolean;
  ultimoAcesso?: ISODate;
  iniciais: string;
  /** Analista habilitado a assinar resultados destes grupos */
  habilitacoes: GrupoAnaliseId[];
  mfa: boolean;
}

/* ---------------- Grupos de análise (conforme sistema atual) ---------------- */

export type GrupoAnaliseId =
  | 'agua-efluentes' | 'bromatologia' | 'compostos-organicos'
  | 'corretivos-agricolas' | 'cromatografia' | 'derivados-cana'
  | 'fertilizantes' | 'foliar' | 'gesso' | 'nematoides'
  | 'patologia' | 'produtos-biologicos' | 'seiva' | 'sementes'
  | 'solo' | 'terceirizadas';

export interface GrupoAnalise {
  id: GrupoAnaliseId;
  nome: string;
  abreviacao: string;
  descricao: string;
  prazoPadraoDias: number;
  temPh: boolean;
  ativo: boolean;
}

/* ---------------- Parâmetros / métodos ---------------- */

export type TipoResultado = 'numerico' | 'texto' | 'opcao' | 'booleano';

export interface Parametro {
  id: UUID;
  codigo: string;              // "PH-H2O"
  nome: string;                // "pH em água"
  grupoId: GrupoAnaliseId;
  unidade: string;             // "", "cmolc/dm³", "mg/dm³"
  tipo: TipoResultado;
  metodo: string;              // "Embrapa 2017 — potenciometria 1:2,5"
  casasDecimais: number;
  /** faixa analítica aceitável do método */
  limiteInferior?: number;
  limiteSuperior?: number;
  /** incerteza expandida do método */
  incerteza?: number;
  preco: number;
  ativo: boolean;
  /** marca os parâmetros resolvidos pela estação de pH */
  ehPh?: boolean;
  /** meio de extração usado na leitura potenciométrica */
  extrator?: 'H2O' | 'CaCl2' | 'KCl' | 'SMP' | 'direto';
  proporcao?: string;          // "1:2,5"
}

/**
 * Pacote de ensaios vendido como unidade — o "Tipo de Análise" do
 * laboratório. O cliente não pede "pH em água"; pede o pacote
 * "SOL GP FERTILIDADE", que carrega os elementos dentro.
 *
 * Hierarquia: Análise (grupo) → Tipo de Análise (pacote) → Elemento (analito).
 */
export interface TipoAnalise {
  id: UUID;
  codigo: string;              // "SOL GP FERTILIDADE"
  nome: string;
  grupoId: GrupoAnaliseId;     // a Análise a que pertence
  parametroIds: UUID[];        // os Elementos que compõem o pacote
  prazoDias: number;
  /** preço do pacote; vazio soma o preço dos elementos */
  preco?: number;
  ativo: boolean;
}

/* ---------------- Clientes / CRM ---------------- */

export type TipoPessoa = 'PJ' | 'PF';
export type EstagioFunil = 'lead' | 'contato' | 'proposta' | 'negociacao' | 'ganho' | 'perdido';

export interface Cliente {
  id: UUID;
  codigo: string;
  nome: string;
  nomeFantasia?: string;
  tipo: TipoPessoa;
  documento: string;           // CNPJ/CPF
  inscricaoEstadual?: string;
  email: string;
  telefone: string;
  municipio: string;
  uf: string;
  cep: string;
  logradouro: string;
  segmento: string;            // "Usina", "Produtor rural", "Cooperativa"
  consultorId?: UUID;          // responsável comercial
  tabelaPrecoId: UUID;
  limiteCredito: number;
  condicaoPagamento: string;   // "28 DDL"
  ativo: boolean;
  criadoEm: ISODate;
  observacoes?: string;
}

export interface Contato {
  id: UUID;
  clienteId: UUID;
  nome: string;
  cargo: string;
  email: string;
  telefone: string;
  principal: boolean;
}

export interface Oportunidade {
  id: UUID;
  titulo: string;
  clienteId: UUID;
  estagio: EstagioFunil;
  valor: number;
  probabilidade: number;
  previsaoFechamento: ISODate;
  responsavelId: UUID;
  criadaEm: ISODate;
  ultimaInteracao: ISODate;
  origem: string;
  notas?: string;
}

export interface Interacao {
  id: UUID;
  clienteId: UUID;
  oportunidadeId?: UUID;
  tipo: 'ligacao' | 'email' | 'visita' | 'whatsapp' | 'reuniao';
  resumo: string;
  data: ISODate;
  autorId: UUID;
}

/* ---------------- Amostras ---------------- */

export type StatusAmostra =
  | 'recebida' | 'preparo' | 'em-analise' | 'aguardando-revisao'
  | 'liberada' | 'cancelada';

export type Prioridade = 'normal' | 'urgente' | 'emergencial';

export interface Amostra {
  id: UUID;
  protocolo: string;            // "25.014532"
  loteRecepcaoId: UUID;
  clienteId: UUID;
  grupoId: GrupoAnaliseId;
  unidadeId: UUID;
  identificacaoCampo: string;   // identificação dada pelo cliente
  /** pacote contratado para esta amostra */
  tipoAnaliseId?: UUID;
  fazenda?: string;             // "Propriedade", no vocabulário do laboratório
  talhao?: string;
  profundidade?: string;        // "0-20 cm"
  cultura?: string;
  dataColeta: ISODate;
  dataRecepcao: ISODate;
  prazoEntrega: ISODate;
  status: StatusAmostra;
  prioridade: Prioridade;
  massaRecebida?: number;       // g
  temperaturaRecebimento?: number;
  conformeNoRecebimento: boolean;
  naoConformidade?: string;
  posicaoBandeja?: string;      // "B12-07"
  observacoes?: string;
}

export interface LoteRecepcao {
  id: UUID;
  numero: string;               // "REC-2025-0841"
  clienteId: UUID;
  dataRecepcao: ISODate;
  recebidoPorId: UUID;
  quantidadeAmostras: number;
  notaFiscalRemessa?: string;
  transportadora?: string;
  observacoes?: string;
}

/* ---------------- Ensaios ---------------- */

export type StatusEnsaio =
  | 'pendente' | 'em-bancada' | 'lido' | 'revisado' | 'aprovado' | 'repetir';

export interface Ensaio {
  id: UUID;
  amostraId: UUID;
  parametroId: UUID;
  status: StatusEnsaio;
  valor?: number;
  valorTexto?: string;
  unidade: string;
  analistaId?: UUID;
  revisorId?: UUID;
  dataLeitura?: ISODate;
  dataAprovacao?: ISODate;
  /** leitura potenciométrica que originou o resultado */
  leituraPhId?: UUID;
  observacao?: string;
  foraDeFaixa?: boolean;
}

/* ---------------- Núcleo: potenciometria / pH ---------------- */

export type OrigemLeitura = 'instrumento' | 'manual' | 'importacao';

export interface Equipamento {
  id: UUID;
  tag: string;                  // "PHM-02"
  nome: string;                 // "Potenciômetro de bancada"
  fabricante: string;
  modelo: string;
  numeroSerie: string;
  tipo: 'phmetro' | 'balanca' | 'estufa' | 'espectrofotometro' | 'agitador' | 'outro';
  unidadeId: UUID;
  setor: string;
  /** integração serial: baud rate e protocolo do fabricante */
  protocolo?: 'generico-ascii' | 'mettler' | 'hanna' | 'digimed' | 'tecnal';
  baudRate?: number;
  ativo: boolean;
  dataAquisicao: ISODate;
  proximaManutencao: ISODate;
  /** eletrodo acoplado, quando pHmetro */
  eletrodo?: Eletrodo;
}

export interface Eletrodo {
  id: UUID;
  modelo: string;
  numeroSerie: string;
  dataInstalacao: ISODate;
  /** vida útil estimada em meses */
  vidaUtilMeses: number;
}

export interface PontoCalibracao {
  /** valor nominal do tampão a 25 °C */
  tampao: number;               // 4.00 | 7.00 | 10.01
  /** potencial medido em mV */
  mV: number;
  temperatura: number;          // °C
  lote?: string;                // lote do tampão certificado
}

export type StatusCalibracao = 'valida' | 'vencida' | 'reprovada';

export interface Calibracao {
  id: UUID;
  equipamentoId: UUID;
  analistaId: UUID;
  data: ISODate;
  pontos: PontoCalibracao[];
  /** % em relação ao slope teórico de Nernst (59,16 mV/pH a 25 °C) */
  slopePercentual: number;
  /** mV medidos no ponto isopotencial (pH 7) */
  offsetMv: number;
  slopeMvPorPh: number;
  r2: number;
  status: StatusCalibracao;
  validaAte: ISODate;
  observacao?: string;
}

/** Amostragem bruta do instrumento durante a estabilização */
export interface PontoTrace {
  t: number;                    // segundos desde o início
  mV: number;
  ph: number;
  temperatura: number;
}

export interface LeituraPh {
  id: UUID;
  ensaioId: UUID;
  amostraId: UUID;
  parametroId: UUID;
  equipamentoId: UUID;
  calibracaoId: UUID;
  analistaId: UUID;
  origem: OrigemLeitura;
  /** leitura bruta do eletrodo */
  mV: number;
  temperatura: number;
  /** pH calculado a partir de mV + calibração */
  phBruto: number;
  /** pH após compensação automática de temperatura para 25 °C */
  phCorrigido: number;
  /** desvio em mV/min no momento da captura */
  derivaMvPorMin: number;
  estavel: boolean;
  /** segundos até estabilizar */
  tempoEstabilizacaoS: number;
  extrator: 'H2O' | 'CaCl2' | 'KCl' | 'SMP' | 'direto';
  proporcao: string;
  dataHora: ISODate;
  trace?: PontoTrace[];
  /** réplicas da mesma amostra, para cálculo de RSD */
  replicaDe?: UUID;
  observacao?: string;
}

/* ---------------- Controle de qualidade ---------------- */

export type ResultadoCQ = 'aprovado' | 'alerta' | 'reprovado';

export interface AmostraControle {
  id: UUID;
  nome: string;                 // "MRC Solo pH 5,52"
  tipo: 'mrc' | 'controle-interno' | 'branco' | 'duplicata';
  valorAlvo: number;
  desvioPadrao: number;
  lote: string;
  validade: ISODate;
  grupoId: GrupoAnaliseId;
}

export interface RegistroCQ {
  id: UUID;
  controleId: UUID;
  equipamentoId: UUID;
  analistaId: UUID;
  data: ISODate;
  valorMedido: number;
  /** desvio em unidades de sigma (eixo da carta de Levey-Jennings) */
  zScore: number;
  resultado: ResultadoCQ;
  regraViolada?: string;        // "1-3s", "2-2s", "R-4s", "10x"
}

/* ---------------- Laudos ---------------- */

export type StatusLaudo = 'rascunho' | 'aguardando-assinatura' | 'emitido' | 'cancelado';

export interface Laudo {
  id: UUID;
  numero: string;               // "LA-2025-03188"
  clienteId: UUID;
  amostraIds: UUID[];
  grupoId: GrupoAnaliseId;
  status: StatusLaudo;
  emitidoEm?: ISODate;
  assinadoPorId?: UUID;
  versao: number;
  hashDocumento?: string;       // integridade / verificação pública
  enviadoEmail: boolean;
  observacoes?: string;
}

/* ---------------- Comercial / financeiro ---------------- */

export interface TabelaPreco {
  id: UUID;
  nome: string;
  desconto: number;             // % sobre a tabela cheia
  ativa: boolean;
}

export type StatusOrcamento = 'rascunho' | 'enviado' | 'aprovado' | 'recusado' | 'expirado';

export interface Orcamento {
  id: UUID;
  numero: string;
  clienteId: UUID;
  oportunidadeId?: UUID;
  status: StatusOrcamento;
  emitidoEm: ISODate;
  validoAte: ISODate;
  itens: ItemOrcamento[];
  desconto: number;
  total: number;
  responsavelId: UUID;
}

export interface ItemOrcamento {
  parametroId?: UUID;
  grupoId?: GrupoAnaliseId;
  descricao: string;
  quantidade: number;
  valorUnitario: number;
}

export type StatusTitulo = 'aberto' | 'pago' | 'vencido' | 'cancelado' | 'parcial';
export type TipoTitulo = 'receber' | 'pagar';

export interface Titulo {
  id: UUID;
  tipo: TipoTitulo;
  numero: string;
  clienteId?: UUID;
  fornecedor?: string;
  descricao: string;
  categoria: string;            // centro de custo / plano de contas
  emissao: ISODate;
  vencimento: ISODate;
  pagamento?: ISODate;
  valor: number;
  valorPago: number;
  status: StatusTitulo;
  formaPagamento?: 'boleto' | 'pix' | 'transferencia' | 'cartao' | 'dinheiro';
  notaFiscalId?: UUID;
}

/* ---------------- Fiscal ---------------- */

export type StatusNota =
  | 'rascunho' | 'em-processamento' | 'autorizada' | 'rejeitada' | 'cancelada';

export interface NotaFiscal {
  id: UUID;
  /** laboratório presta serviço → NFS-e municipal; venda de insumo → NF-e */
  modelo: 'NFS-e' | 'NF-e';
  numero: string;
  serie: string;
  clienteId: UUID;
  emissao: ISODate;
  competencia: string;          // "2025-09"
  status: StatusNota;
  /** código do serviço na lista da LC 116/03 — 17.01 / 21.01 p/ laboratório */
  codigoServico: string;
  discriminacao: string;
  valorServicos: number;
  deducoes: number;
  baseCalculo: number;
  aliquotaIss: number;
  valorIss: number;
  issRetido: boolean;
  valorIr: number;
  valorPis: number;
  valorCofins: number;
  valorCsll: number;
  valorInss: number;
  valorLiquido: number;
  chaveAcesso?: string;
  protocoloAutorizacao?: string;
  motivoRejeicao?: string;
  laudoIds: UUID[];
}

/* ---------------- Estoque de reagentes ---------------- */

export type ClasseReagente = 'padrao' | 'tampao' | 'solvente' | 'acido' | 'base' | 'vidraria' | 'consumivel';

export interface ItemEstoque {
  id: UUID;
  codigo: string;
  nome: string;
  classe: ClasseReagente;
  fabricante: string;
  unidadeMedida: string;        // "L", "kg", "un"
  saldo: number;
  estoqueMinimo: number;
  localizacao: string;
  custoUnitario: number;
  /** controle da Polícia Federal / Exército para produtos controlados */
  controlado: boolean;
}

export interface LoteReagente {
  id: UUID;
  itemId: UUID;
  lote: string;
  validade: ISODate;
  quantidade: number;
  certificadoUrl?: string;
  aberto: boolean;
  abertoEm?: ISODate;
}

export interface MovimentoEstoque {
  id: UUID;
  itemId: UUID;
  loteId?: UUID;
  tipo: 'entrada' | 'saida' | 'ajuste' | 'descarte';
  quantidade: number;
  data: ISODate;
  usuarioId: UUID;
  motivo: string;
}

/* ---------------- Auditoria ---------------- */

export interface RegistroAuditoria {
  id: UUID;
  data: ISODate;
  usuarioId: UUID;
  acao: string;
  entidade: string;
  entidadeId: string;
  detalhe: string;
  ip?: string;
}

/* ============================================================
   AQUISIÇÃO GENÉRICA DE MEDIÇÕES
   O pH é um instrumento, não o molde. Tudo que um aparelho de
   bancada produz entra por aqui, no mesmo envelope, venha de
   cabo serial, de arquivo, de API ou da mão do analista.
   ============================================================ */

/** Grandeza física que um instrumento entrega. */
export type Grandeza =
  | 'ph' | 'potencial' | 'temperatura' | 'massa' | 'absorbancia'
  | 'condutividade' | 'volume' | 'concentracao' | 'intensidade'
  | 'umidade' | 'turbidez';

export interface Medicao {
  grandeza: Grandeza;
  valor: number;
  unidade: string;
}

export type TipoInstrumento =
  | 'phmetro' | 'balanca' | 'espectrofotometro' | 'fotometro-chama'
  | 'absorcao-atomica' | 'titulador' | 'destilador' | 'condutivimetro'
  | 'turbidimetro' | 'cromatografo' | 'estufa' | 'agitador' | 'outro';

export type Transporte = 'serial' | 'arquivo' | 'api' | 'manual';

export interface ConfigSerial {
  baudRate: number;
  dataBits?: 7 | 8;
  stopBits?: 1 | 2;
  parity?: 'none' | 'even' | 'odd';
}

/** Extração de uma grandeza da linha emitida pelo instrumento. */
export interface CampoPerfil {
  grandeza: Grandeza;
  /** expressão regular com um grupo de captura para o número */
  padrao: string;
  /** unidade assumida quando a linha não a declara */
  unidade?: string;
  /** multiplicador aplicado ao valor extraído (ex.: mg para g) */
  fator?: number;
}

/**
 * Perfil de instrumento — o driver vive como CADASTRO, não como código.
 * Suportar um aparelho novo num cliente novo passa a ser preencher um
 * formulário, não publicar uma versão do sistema.
 */
export interface PerfilInstrumento {
  id: string;
  nome: string;
  fabricante: string;
  modelo: string;
  tipoInstrumento: TipoInstrumento;
  transporte: Transporte;
  serial?: ConfigSerial;
  /** extração por expressão regular, campo a campo */
  campos: CampoPerfil[];
  /** formato tabular: a ordem das grandezas nas colunas */
  colunas?: { separador: string; ordem: Array<Grandeza | null> };
  /** quando casa, o instrumento sinalizou que a leitura estabilizou */
  padraoEstavel?: string;
  /** a grandeza que vira o resultado do ensaio */
  grandezaPrincipal: Grandeza;
  /** linha real do aparelho, usada para conferir o perfil no cadastro */
  exemplo: string;
  /** perfis de fábrica não podem ser excluídos, só desativados */
  sistema: boolean;
  ativo: boolean;
  observacao?: string;
}

export type OrigemMedicao = 'instrumento' | 'agente' | 'api' | 'importacao' | 'manual';

/**
 * Envelope único de ingestão. Todo adaptador entrega nisto, e é sobre
 * isto que a validação, a auditoria e a correção acontecem — uma vez só,
 * independentemente de o número ter vindo de um cabo ou de um teclado.
 */
export interface EnvelopeMedicao {
  /** impede que um reenvio depois de queda de rede duplique a leitura */
  idempotencia: string;
  instrumento: { tag: string; numeroSerie?: string };
  amostra: { protocolo?: string; identificacaoCampo?: string };
  /** código do parâmetro; ausente, resolve-se pela grandeza principal */
  parametroCodigo?: string;
  /** a medição que vira resultado */
  principal: Medicao;
  /** temperatura, potencial e o que mais o aparelho tiver mandado */
  auxiliares: Medicao[];
  /** horário do instrumento, não o do servidor */
  instante: ISODate;
  calibracaoId?: string;
  operadorId?: string;
  origem: OrigemMedicao;
  /** a linha crua, guardada para sempre: é o que prova a rastreabilidade */
  linha?: string;
  perfilId?: string;
}

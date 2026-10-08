/* ============================================================
   BANCADA — massa de dados de demonstração
   Gerador determinístico: a mesma semente produz sempre o
   mesmo laboratório, o que torna telas e gráficos reprodutíveis.
   ============================================================ */

import { PAPEIS_PADRAO } from '../lib/rbac';
import { calcularCalibracao, mvDePh, phDeMv, corrigirPara25C, avaliarCQ } from '../lib/ph';
import { apurarNotaServico } from '../lib/fiscal';
import { iniciais } from '../lib/format';
import type {
  Amostra, AmostraControle, Calibracao, Cliente, Contato, Ensaio, Equipamento,
  GrupoAnalise, GrupoAnaliseId, Interacao, ItemEstoque, Laudo, LeituraPh,
  LoteReagente, LoteRecepcao, MovimentoEstoque, NotaFiscal, Oportunidade,
  Orcamento, Papel, Parametro, PontoTrace, RegistroAuditoria, RegistroCQ,
  StatusAmostra, TabelaPreco, TipoAnalise, Titulo, Unidade, Usuario,
} from '../types';

/* ---------------- PRNG determinístico (mulberry32) ---------------- */

function criarRng(semente: number) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = criarRng(20250917);
const rnd = () => rng();
const entre = (min: number, max: number) => min + rnd() * (max - min);
const inteiro = (min: number, max: number) => Math.floor(entre(min, max + 1));
const escolher = <T,>(lista: readonly T[]): T => lista[Math.floor(rnd() * lista.length)];
const chance = (p: number) => rnd() < p;

const HOJE = new Date();
HOJE.setHours(9, 0, 0, 0);

function diasAtras(d: number, horaDia?: number): string {
  const dt = new Date(HOJE);
  dt.setDate(dt.getDate() - d);
  if (horaDia !== undefined) dt.setHours(horaDia, inteiro(0, 59), inteiro(0, 59), 0);
  return dt.toISOString();
}
function diasAFrente(d: number): string {
  return diasAtras(-d);
}

/* ---------------- Unidades ---------------- */

export const unidades: Unidade[] = [
  {
    id: 'un-13', codigo: '13', sigla: 'LEM/BA', nome: 'Laboratório Solos & Plantas',
    cnpj: '18.472.904/0001-55', municipio: 'Luís Eduardo Magalhães', uf: 'BA',
    responsavelTecnico: 'Dra. Helena Vasconcelos Prado', crq: 'CRQ VII 07401293',
    acreditacao: 'ISO/IEC 17025 · CRL 0942 · RBLE/MAPA 0318',
  },
  {
    id: 'un-07', codigo: '07', sigla: 'RVD/MT', nome: 'Unidade Rio Verde',
    cnpj: '18.472.904/0002-36', municipio: 'Rondonópolis', uf: 'MT',
    responsavelTecnico: 'Dr. Átila Monteiro Rezende', crq: 'CRQ XV 15203884',
    acreditacao: 'RBLE/MAPA 0318',
  },
];

/* ---------------- Grupos de análise ---------------- */

export const grupos: GrupoAnalise[] = [
  { id: 'agua-efluentes', nome: 'Água e Efluentes', abreviacao: 'ÁGU', descricao: 'Potabilidade, irrigação, efluente industrial e fertirrigação.', prazoPadraoDias: 7, temPh: true, ativo: true },
  { id: 'bromatologia', nome: 'Bromatologia', abreviacao: 'BRO', descricao: 'Composição de forragens, silagens, rações e subprodutos.', prazoPadraoDias: 10, temPh: true, ativo: true },
  { id: 'compostos-organicos', nome: 'Compostos Orgânicos', abreviacao: 'CPO', descricao: 'Compostagem, vermicomposto e resíduos orgânicos.', prazoPadraoDias: 12, temPh: true, ativo: true },
  { id: 'corretivos-agricolas', nome: 'Corretivos Agrícolas', abreviacao: 'COR', descricao: 'Calcário, PRNT, poder de neutralização e reatividade.', prazoPadraoDias: 8, temPh: true, ativo: true },
  { id: 'cromatografia', nome: 'Cromatografia', abreviacao: 'CRO', descricao: 'Resíduos de agrotóxicos por HPLC e GC-MS/MS.', prazoPadraoDias: 15, temPh: false, ativo: true },
  { id: 'derivados-cana', nome: 'Derivados de Cana', abreviacao: 'DCA', descricao: 'Caldo, melaço, vinhaça, torta de filtro e açúcar.', prazoPadraoDias: 6, temPh: true, ativo: true },
  { id: 'fertilizantes', nome: 'Fertilizantes', abreviacao: 'FER', descricao: 'Garantias de NPK, micronutrientes e granulometria.', prazoPadraoDias: 10, temPh: true, ativo: true },
  { id: 'foliar', nome: 'Foliar (Tecido Vegetal)', abreviacao: 'FOL', descricao: 'Estado nutricional por diagnose foliar.', prazoPadraoDias: 8, temPh: false, ativo: true },
  { id: 'gesso', nome: 'Gesso', abreviacao: 'GES', descricao: 'Gesso agrícola: cálcio, enxofre e umidade.', prazoPadraoDias: 8, temPh: true, ativo: true },
  { id: 'nematoides', nome: 'Nematoides', abreviacao: 'NEM', descricao: 'Extração e contagem de fitonematoides em solo e raiz.', prazoPadraoDias: 7, temPh: false, ativo: true },
  { id: 'patologia', nome: 'Patologia', abreviacao: 'PAT', descricao: 'Fitopatologia: identificação de fungos e bactérias.', prazoPadraoDias: 12, temPh: false, ativo: true },
  { id: 'produtos-biologicos', nome: 'Produtos Biológicos', abreviacao: 'BIO', descricao: 'Contagem de UFC e pureza de inoculantes.', prazoPadraoDias: 14, temPh: true, ativo: true },
  { id: 'seiva', nome: 'Seiva', abreviacao: 'SEI', descricao: 'Análise de seiva para manejo nutricional em tempo real.', prazoPadraoDias: 4, temPh: true, ativo: true },
  { id: 'sementes', nome: 'Sementes', abreviacao: 'SEM', descricao: 'Germinação, vigor, pureza e tetrazólio.', prazoPadraoDias: 20, temPh: false, ativo: true },
  { id: 'solo', nome: 'Solo', abreviacao: 'SOL', descricao: 'Fertilidade completa, textura e acidez.', prazoPadraoDias: 7, temPh: true, ativo: true },
  { id: 'terceirizadas', nome: 'Terceirizadas', abreviacao: 'TER', descricao: 'Ensaios subcontratados a laboratórios parceiros.', prazoPadraoDias: 25, temPh: false, ativo: true },
];

/* ---------------- Parâmetros ---------------- */

export const parametros: Parametro[] = [
  // --- Solo: os três pH são o coração da operação ---
  { id: 'par-ph-h2o', codigo: 'PH-H2O', nome: 'pH em água', grupoId: 'solo', unidade: '', tipo: 'numerico', metodo: 'Embrapa 2017 — potenciometria, suspensão 1:2,5', casasDecimais: 2, limiteInferior: 3, limiteSuperior: 10, incerteza: 0.08, preco: 9.4, ativo: true, ehPh: true, extrator: 'H2O', proporcao: '1:2,5' },
  { id: 'par-ph-cacl2', codigo: 'PH-CACL2', nome: 'pH em CaCl₂ 0,01 mol/L', grupoId: 'solo', unidade: '', tipo: 'numerico', metodo: 'IAC Boletim 100 — potenciometria, suspensão 1:2,5', casasDecimais: 2, limiteInferior: 3, limiteSuperior: 9, incerteza: 0.07, preco: 10.2, ativo: true, ehPh: true, extrator: 'CaCl2', proporcao: '1:2,5' },
  { id: 'par-ph-smp', codigo: 'PH-SMP', nome: 'Índice SMP', grupoId: 'solo', unidade: '', tipo: 'numerico', metodo: 'CFSEMG — tampão SMP para estimativa de H+Al', casasDecimais: 2, limiteInferior: 4, limiteSuperior: 7.5, incerteza: 0.06, preco: 11.0, ativo: true, ehPh: true, extrator: 'SMP', proporcao: '1:2,5' },
  { id: 'par-ph-kcl', codigo: 'PH-KCL', nome: 'pH em KCl 1 mol/L', grupoId: 'solo', unidade: '', tipo: 'numerico', metodo: 'Embrapa 2017 — potenciometria em KCl', casasDecimais: 2, incerteza: 0.08, preco: 10.2, ativo: true, ehPh: true, extrator: 'KCl', proporcao: '1:2,5' },
  { id: 'par-mo', codigo: 'MO', nome: 'Matéria orgânica', grupoId: 'solo', unidade: 'g/dm³', tipo: 'numerico', metodo: 'Walkley-Black modificado', casasDecimais: 1, preco: 12.5, ativo: true },
  { id: 'par-p-mel', codigo: 'P-MEL', nome: 'Fósforo (Mehlich-1)', grupoId: 'solo', unidade: 'mg/dm³', tipo: 'numerico', metodo: 'Extração Mehlich-1 + colorimetria', casasDecimais: 1, preco: 13.0, ativo: true },
  { id: 'par-k', codigo: 'K', nome: 'Potássio trocável', grupoId: 'solo', unidade: 'mg/dm³', tipo: 'numerico', metodo: 'Mehlich-1 + fotometria de chama', casasDecimais: 1, preco: 11.5, ativo: true },
  { id: 'par-ca', codigo: 'CA', nome: 'Cálcio trocável', grupoId: 'solo', unidade: 'cmolc/dm³', tipo: 'numerico', metodo: 'KCl 1 mol/L + EAA', casasDecimais: 2, preco: 11.5, ativo: true },
  { id: 'par-mg', codigo: 'MG', nome: 'Magnésio trocável', grupoId: 'solo', unidade: 'cmolc/dm³', tipo: 'numerico', metodo: 'KCl 1 mol/L + EAA', casasDecimais: 2, preco: 11.5, ativo: true },
  { id: 'par-hal', codigo: 'H+AL', nome: 'Acidez potencial (H+Al)', grupoId: 'solo', unidade: 'cmolc/dm³', tipo: 'numerico', metodo: 'Estimada pelo índice SMP', casasDecimais: 2, preco: 9.8, ativo: true },
  { id: 'par-al', codigo: 'AL', nome: 'Alumínio trocável', grupoId: 'solo', unidade: 'cmolc/dm³', tipo: 'numerico', metodo: 'KCl 1 mol/L + titulometria', casasDecimais: 2, preco: 9.8, ativo: true },
  { id: 'par-ctc', codigo: 'CTC', nome: 'CTC a pH 7,0', grupoId: 'solo', unidade: 'cmolc/dm³', tipo: 'numerico', metodo: 'Cálculo: SB + (H+Al)', casasDecimais: 2, preco: 0, ativo: true },
  { id: 'par-v', codigo: 'V', nome: 'Saturação por bases', grupoId: 'solo', unidade: '%', tipo: 'numerico', metodo: 'Cálculo: 100 · SB / CTC', casasDecimais: 1, preco: 0, ativo: true },
  { id: 'par-argila', codigo: 'ARG', nome: 'Argila', grupoId: 'solo', unidade: 'g/kg', tipo: 'numerico', metodo: 'Densímetro de Bouyoucos', casasDecimais: 0, preco: 18.0, ativo: true },

  // --- Água e efluentes ---
  { id: 'par-ph-agua', codigo: 'PH-AGUA', nome: 'pH', grupoId: 'agua-efluentes', unidade: '', tipo: 'numerico', metodo: 'SMEWW 4500-H⁺ B — potenciometria direta', casasDecimais: 2, limiteInferior: 0, limiteSuperior: 14, incerteza: 0.05, preco: 22.0, ativo: true, ehPh: true, extrator: 'direto', proporcao: 'direto' },
  { id: 'par-ce', codigo: 'CE', nome: 'Condutividade elétrica', grupoId: 'agua-efluentes', unidade: 'µS/cm', tipo: 'numerico', metodo: 'SMEWW 2510 B', casasDecimais: 1, preco: 21.0, ativo: true },
  { id: 'par-dbo', codigo: 'DBO', nome: 'DBO₅,₂₀', grupoId: 'agua-efluentes', unidade: 'mg/L', tipo: 'numerico', metodo: 'SMEWW 5210 B', casasDecimais: 1, preco: 78.0, ativo: true },
  { id: 'par-dqo', codigo: 'DQO', nome: 'DQO', grupoId: 'agua-efluentes', unidade: 'mg/L', tipo: 'numerico', metodo: 'SMEWW 5220 D', casasDecimais: 1, preco: 72.0, ativo: true },
  { id: 'par-turb', codigo: 'TURB', nome: 'Turbidez', grupoId: 'agua-efluentes', unidade: 'NTU', tipo: 'numerico', metodo: 'SMEWW 2130 B — nefelometria', casasDecimais: 2, preco: 24.0, ativo: true },

  // --- Foliar ---
  { id: 'par-n-foliar', codigo: 'N-FOL', nome: 'Nitrogênio total', grupoId: 'foliar', unidade: 'g/kg', tipo: 'numerico', metodo: 'Kjeldahl', casasDecimais: 1, preco: 19.0, ativo: true },
  { id: 'par-p-foliar', codigo: 'P-FOL', nome: 'Fósforo', grupoId: 'foliar', unidade: 'g/kg', tipo: 'numerico', metodo: 'Digestão nitroperclórica + colorimetria', casasDecimais: 2, preco: 17.0, ativo: true },
  { id: 'par-k-foliar', codigo: 'K-FOL', nome: 'Potássio', grupoId: 'foliar', unidade: 'g/kg', tipo: 'numerico', metodo: 'Digestão nitroperclórica + fotometria', casasDecimais: 2, preco: 17.0, ativo: true },

  // --- Corretivos ---
  { id: 'par-prnt', codigo: 'PRNT', nome: 'PRNT', grupoId: 'corretivos-agricolas', unidade: '%', tipo: 'numerico', metodo: 'IN SDA 05/2007', casasDecimais: 1, preco: 54.0, ativo: true },
  { id: 'par-pn', codigo: 'PN', nome: 'Poder de neutralização', grupoId: 'corretivos-agricolas', unidade: '%', tipo: 'numerico', metodo: 'Titulometria com HCl — IN SDA 05/2007', casasDecimais: 1, preco: 38.0, ativo: true },
  { id: 'par-ph-cor', codigo: 'PH-COR', nome: 'pH da suspensão', grupoId: 'corretivos-agricolas', unidade: '', tipo: 'numerico', metodo: 'Potenciometria, suspensão 1:5', casasDecimais: 2, incerteza: 0.06, preco: 14.0, ativo: true, ehPh: true, extrator: 'H2O', proporcao: '1:5' },

  // --- Fertilizantes / orgânicos ---
  { id: 'par-ph-fert', codigo: 'PH-FERT', nome: 'pH em solução', grupoId: 'fertilizantes', unidade: '', tipo: 'numerico', metodo: 'IN SDA 28/2007 — potenciometria 1:10', casasDecimais: 2, incerteza: 0.06, preco: 16.0, ativo: true, ehPh: true, extrator: 'H2O', proporcao: '1:10' },
  { id: 'par-n-total', codigo: 'N-TOT', nome: 'Nitrogênio total', grupoId: 'fertilizantes', unidade: '%', tipo: 'numerico', metodo: 'IN SDA 28/2007 — Kjeldahl', casasDecimais: 2, preco: 32.0, ativo: true },
  { id: 'par-ph-comp', codigo: 'PH-COMP', nome: 'pH do composto', grupoId: 'compostos-organicos', unidade: '', tipo: 'numerico', metodo: 'IN SDA 28/2007 — potenciometria 1:10', casasDecimais: 2, incerteza: 0.07, preco: 15.0, ativo: true, ehPh: true, extrator: 'H2O', proporcao: '1:10' },
  { id: 'par-ph-cana', codigo: 'PH-CANA', nome: 'pH do caldo', grupoId: 'derivados-cana', unidade: '', tipo: 'numerico', metodo: 'CONSECANA — potenciometria direta', casasDecimais: 2, incerteza: 0.04, preco: 12.0, ativo: true, ehPh: true, extrator: 'direto', proporcao: 'direto' },
  { id: 'par-brix', codigo: 'BRIX', nome: 'Brix', grupoId: 'derivados-cana', unidade: '°Bx', tipo: 'numerico', metodo: 'CONSECANA — refratometria', casasDecimais: 2, preco: 14.0, ativo: true },
  { id: 'par-ph-seiva', codigo: 'PH-SEIVA', nome: 'pH da seiva', grupoId: 'seiva', unidade: '', tipo: 'numerico', metodo: 'Potenciometria direta em extrato de seiva', casasDecimais: 2, incerteza: 0.05, preco: 13.0, ativo: true, ehPh: true, extrator: 'direto', proporcao: 'direto' },
  { id: 'par-germ', codigo: 'GERM', nome: 'Germinação', grupoId: 'sementes', unidade: '%', tipo: 'numerico', metodo: 'RAS/MAPA 2009', casasDecimais: 0, preco: 46.0, ativo: true },
  { id: 'par-nema', codigo: 'NEMA', nome: 'Contagem de fitonematoides', grupoId: 'nematoides', unidade: 'ind./200 cm³', tipo: 'numerico', metodo: 'Jenkins (1964) — flutuação e peneiramento', casasDecimais: 0, preco: 58.0, ativo: true },
];

export const parametrosPh = parametros.filter((p) => p.ehPh);

/* ---------------- Tipos de análise (pacotes vendidos) ---------------- */

const por = (grupo: GrupoAnaliseId, ...codigos: string[]) =>
  codigos
    .map((c) => parametros.find((p) => p.codigo === c && p.grupoId === grupo)?.id)
    .filter((x): x is string => Boolean(x));

const todosDo = (grupo: GrupoAnaliseId) =>
  parametros.filter((p) => p.grupoId === grupo && p.preco > 0).map((p) => p.id);

const TIPOS_ANALISE: TipoAnalise[] = [
  {
    id: 'tpa-sol-fert', codigo: 'SOL GP FERTILIDADE', nome: 'Fertilidade completa',
    grupoId: 'solo', prazoDias: 7, ativo: true,
    parametroIds: por('solo', 'PH-H2O', 'PH-SMP', 'MO', 'P-MEL', 'K', 'CA', 'MG', 'H+AL', 'AL', 'CTC', 'V'),
  },
  {
    id: 'tpa-sol-acidez', codigo: 'SOL GP ACIDEZ', nome: 'Acidez ativa e potencial',
    grupoId: 'solo', prazoDias: 5, ativo: true,
    parametroIds: por('solo', 'PH-H2O', 'PH-CACL2', 'PH-SMP', 'H+AL', 'AL'),
  },
  {
    id: 'tpa-sol-textura', codigo: 'SOL GP TEXTURA', nome: 'Granulometria',
    grupoId: 'solo', prazoDias: 10, ativo: true,
    parametroIds: por('solo', 'ARG'),
  },
  {
    id: 'tpa-fol-completa', codigo: 'FOL GP COMPLETA', nome: 'Diagnose foliar completa',
    grupoId: 'foliar', prazoDias: 8, ativo: true,
    parametroIds: todosDo('foliar'),
  },
  {
    id: 'tpa-agua-conama', codigo: 'AGU GP CONAMA 430', nome: 'Lançamento de efluente',
    grupoId: 'agua-efluentes', prazoDias: 7, ativo: true,
    parametroIds: todosDo('agua-efluentes'),
  },
  {
    id: 'tpa-agua-irrig', codigo: 'AGU GP IRRIGAÇÃO', nome: 'Água para irrigação',
    grupoId: 'agua-efluentes', prazoDias: 7, ativo: true,
    parametroIds: por('agua-efluentes', 'PH-AGUA', 'CE', 'TURB'),
  },
  {
    id: 'tpa-cor-prnt', codigo: 'COR GP PRNT', nome: 'Caracterização de corretivo',
    grupoId: 'corretivos-agricolas', prazoDias: 8, ativo: true,
    parametroIds: todosDo('corretivos-agricolas'),
  },
  {
    id: 'tpa-fer-garantia', codigo: 'FER GP GARANTIA', nome: 'Garantias do fertilizante',
    grupoId: 'fertilizantes', prazoDias: 10, ativo: true,
    parametroIds: todosDo('fertilizantes'),
  },
  {
    id: 'tpa-bro-nitro', codigo: 'BR GP NITROGÊNIO', nome: 'Nitrogênio e proteína bruta',
    grupoId: 'bromatologia', prazoDias: 10, ativo: true,
    parametroIds: todosDo('bromatologia'),
  },
  {
    id: 'tpa-cana-consecana', codigo: 'DCA GP CONSECANA', nome: 'Pagamento CONSECANA',
    grupoId: 'derivados-cana', prazoDias: 6, ativo: true,
    parametroIds: todosDo('derivados-cana'),
  },
  {
    id: 'tpa-cpo-organico', codigo: 'CPO GP ORGÂNICO', nome: 'Composto orgânico',
    grupoId: 'compostos-organicos', prazoDias: 12, ativo: true,
    parametroIds: todosDo('compostos-organicos'),
  },
  {
    id: 'tpa-sei-nutri', codigo: 'SEI GP NUTRICIONAL', nome: 'Seiva — manejo nutricional',
    grupoId: 'seiva', prazoDias: 4, ativo: true,
    parametroIds: todosDo('seiva'),
  },
  {
    id: 'tpa-sem-germ', codigo: 'SEM GP GERMINAÇÃO', nome: 'Germinação e vigor',
    grupoId: 'sementes', prazoDias: 20, ativo: true,
    parametroIds: todosDo('sementes'),
  },
  {
    id: 'tpa-nem-contagem', codigo: 'NEM GP CONTAGEM', nome: 'Contagem de fitonematoides',
    grupoId: 'nematoides', prazoDias: 7, ativo: true,
    parametroIds: todosDo('nematoides'),
  },
  {
    id: 'tpa-ges-agricola', codigo: 'GES GP AGRÍCOLA', nome: 'Gesso agrícola',
    grupoId: 'gesso', prazoDias: 8, ativo: true,
    parametroIds: todosDo('gesso'),
  },
  {
    id: 'tpa-bio-ufc', codigo: 'BIO GP UFC', nome: 'Contagem de UFC',
    grupoId: 'produtos-biologicos', prazoDias: 14, ativo: true,
    parametroIds: todosDo('produtos-biologicos'),
  },
];

/** Um pacote sem elementos resolvidos não entra no catálogo. */
export const tiposAnalise: TipoAnalise[] = TIPOS_ANALISE.filter((t) => t.parametroIds.length > 0);

const tiposPorGrupo = new Map<GrupoAnaliseId, TipoAnalise[]>();
for (const t of tiposAnalise) {
  const lista = tiposPorGrupo.get(t.grupoId) ?? [];
  lista.push(t);
  tiposPorGrupo.set(t.grupoId, lista);
}

/* ---------------- Papéis e usuários ---------------- */

export const papeis: Papel[] = PAPEIS_PADRAO;

const PESSOAS: Array<[string, string, string, string[]]> = [
  ['Helena Vasconcelos Prado', 'papel-rt', 'Responsável Técnica', ['solo', 'foliar', 'agua-efluentes', 'corretivos-agricolas']],
  ['Átila Monteiro Rezende', 'papel-rt', 'Gerente Técnico', ['solo', 'fertilizantes', 'derivados-cana']],
  ['Juliana Sampaio Freire', 'papel-analista', 'Analista Sênior — Bancada de Acidez', ['solo', 'corretivos-agricolas', 'compostos-organicos']],
  ['Ricardo Tavares Boaventura', 'papel-analista', 'Analista Pleno — Úmidos', ['agua-efluentes', 'derivados-cana', 'seiva']],
  ['Marina Okabe Lins', 'papel-analista', 'Analista Júnior — Preparo', ['solo', 'foliar']],
  ['Dalton Ferreira Quirino', 'papel-analista', 'Analista — Fertilizantes', ['fertilizantes', 'gesso', 'corretivos-agricolas']],
  ['Soraia Benevides Castro', 'papel-recepcao', 'Coordenadora de Recepção', []],
  ['Wesley Duarte Nogueira', 'papel-recepcao', 'Auxiliar de Recepção', []],
  ['Patrícia Lemos Arantes', 'papel-comercial', 'Consultora Técnica Comercial', []],
  ['Gustavo Pinheiro Sales', 'papel-comercial', 'Gerente Comercial', []],
  ['Cláudia Nakamura Reis', 'papel-financeiro', 'Analista Financeira', []],
  ['Otávio Brandão Mendes', 'papel-admin', 'Diretor de Operações', []],
];

export const usuarios: Usuario[] = PESSOAS.map(([nome, papelId, cargo, habilitacoes], i) => ({
  id: `usr-${String(i + 1).padStart(2, '0')}`,
  nome,
  email: `${nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(' ')[0]}.${nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(' ').pop()}@solosplantas.com.br`,
  cargo,
  papelId,
  unidadeIds: i % 5 === 1 ? ['un-07'] : ['un-13'],
  ativo: i !== 7,
  ultimoAcesso: diasAtras(inteiro(0, 9), inteiro(7, 19)),
  iniciais: iniciais(nome),
  habilitacoes: habilitacoes as GrupoAnaliseId[],
  mfa: i < 4 || papelId === 'papel-admin' || papelId === 'papel-financeiro',
}));

export const usuarioAtual = usuarios[0];

/* ---------------- Clientes ---------------- */

const EMPRESAS: Array<[string, string, string, string, string]> = [
  ['Agropecuária Vale do Rio Grande S.A.', 'Usina', 'Barreiras', 'BA', '12.845.773/0001-04'],
  ['Fazenda Serra Azul Ltda.', 'Produtor rural', 'Luís Eduardo Magalhães', 'BA', '27.391.556/0001-78'],
  ['Cooperativa Agroindustrial do Oeste', 'Cooperativa', 'Formosa do Rio Preto', 'BA', '04.118.962/0001-30'],
  ['Usina Santa Terezinha Açúcar e Álcool', 'Usina', 'Rondonópolis', 'MT', '33.907.214/0001-69'],
  ['Grupo Cerrado Fértil Agronegócios', 'Revenda de insumos', 'Sorriso', 'MT', '19.620.483/0001-12'],
  ['Sementes Planalto Central Ltda.', 'Sementeira', 'Rio Verde', 'GO', '08.774.120/0001-95'],
  ['Fazenda Boa Esperança', 'Produtor rural', 'São Desidério', 'BA', '31.256.907/0001-41'],
  ['Nutriplant Fertilizantes Especiais', 'Indústria de fertilizantes', 'Uberaba', 'MG', '22.019.338/0001-27'],
  ['Calcário Chapadão Mineração Ltda.', 'Mineradora', 'Chapadão do Sul', 'MS', '15.883.471/0001-80'],
  ['Agro Terra Viva Consultoria', 'Consultoria agronômica', 'Luís Eduardo Magalhães', 'BA', '29.447.015/0001-63'],
  ['Saneamento Municipal de Barreiras', 'Saneamento', 'Barreiras', 'BA', '13.902.644/0001-18'],
  ['BioRaízes Insumos Biológicos', 'Indústria de biológicos', 'Goiânia', 'GO', '36.715.228/0001-54'],
  ['Fazenda Três Marias Agropecuária', 'Produtor rural', 'Correntina', 'BA', '25.608.139/0001-07'],
  ['Destilaria Rio Claro Bioenergia', 'Usina', 'Jataí', 'GO', '11.374.590/0001-72'],
  ['Algodoeira Oeste Baiano S.A.', 'Algodoeira', 'Barreiras', 'BA', '17.236.804/0001-36'],
  ['Gesso Nordeste Indústria e Comércio', 'Indústria', 'Araripina', 'PE', '09.512.667/0001-49'],
  ['Fazenda Nova Canaã', 'Produtor rural', 'Jaborandi', 'BA', '34.871.902/0001-25'],
  ['Pecuária Campo Belo Ltda.', 'Pecuarista', 'Cuiabá', 'MT', '21.065.843/0001-91'],
];

const TABELAS: TabelaPreco[] = [
  { id: 'tab-cheia', nome: 'Tabela cheia', desconto: 0, ativa: true },
  { id: 'tab-parceiro', nome: 'Parceiro — volume', desconto: 12, ativa: true },
  { id: 'tab-coop', nome: 'Cooperado', desconto: 18, ativa: true },
  { id: 'tab-contrato', nome: 'Contrato anual', desconto: 25, ativa: true },
];
export const tabelasPreco = TABELAS;

const comerciais = usuarios.filter((u) => u.papelId === 'papel-comercial');

export const clientes: Cliente[] = EMPRESAS.map(([nome, segmento, municipio, uf, cnpj], i) => ({
  id: `cli-${String(i + 1).padStart(3, '0')}`,
  codigo: `C${String(1040 + i * 7)}`,
  nome,
  nomeFantasia: nome.split(' ').slice(0, 2).join(' '),
  tipo: 'PJ',
  documento: cnpj,
  inscricaoEstadual: String(inteiro(10_000_000, 99_999_999)),
  email: `contato@${nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '').slice(0, 14)}.com.br`,
  telefone: `(${escolher(['77', '66', '64', '34', '67', '87'])}) 9${inteiro(8000, 9999)}-${inteiro(1000, 9999)}`,
  municipio, uf,
  cep: `${inteiro(10, 78)}${inteiro(100, 999)}-${inteiro(100, 999)}`,
  logradouro: `${escolher(['Rod. BR-', 'Av. ', 'Rua ', 'Est. Vicinal '])}${escolher(['242, km 18', 'das Nações 1420', 'Projetada 77', 'do Contorno 350'])}`,
  segmento,
  consultorId: escolher(comerciais).id,
  tabelaPrecoId: escolher(TABELAS).id,
  limiteCredito: inteiro(20, 400) * 1000,
  condicaoPagamento: escolher(['À vista', '14 DDL', '28 DDL', '30/60 DDL', '45 DDL']),
  ativo: i !== 16,
  criadoEm: diasAtras(inteiro(90, 1400)),
  observacoes: i % 5 === 0 ? 'Exige laudo em papel timbrado e envio ao agrônomo responsável.' : undefined,
}));

export const contatos: Contato[] = clientes.flatMap((c, i) => {
  const nomes = [
    'Eng. Agr. Bruno Caldeira', 'Marcela Tonini', 'Eng. Agr. Lucas Peçanha',
    'Rafaela Siqueira', 'Dr. Ednaldo Veras', 'Tatiane Mourão',
  ];
  return Array.from({ length: inteiro(1, 2) }, (_, k) => ({
    id: `ctt-${i}-${k}`,
    clienteId: c.id,
    nome: nomes[(i + k) % nomes.length],
    cargo: escolher(['Agrônomo responsável', 'Gerente agrícola', 'Comprador', 'Coordenador de qualidade']),
    email: `agronomia@${c.email.split('@')[1]}`,
    telefone: c.telefone,
    principal: k === 0,
  }));
});

/* ---------------- CRM ---------------- */

export const oportunidades: Oportunidade[] = [
  ['Contrato safra 25/26 — 4.200 amostras de solo', 'cli-001', 'negociacao', 184_000, 70],
  ['Monitoramento de efluente — 12 meses', 'cli-011', 'proposta', 96_400, 50],
  ['Pacote foliar cana — 3 ciclos', 'cli-004', 'ganho', 142_800, 100],
  ['Caracterização de calcário — lote trimestral', 'cli-009', 'contato', 58_200, 30],
  ['Diagnose de seiva — piloto algodão', 'cli-015', 'proposta', 44_600, 55],
  ['Registro MAPA de inoculante', 'cli-012', 'negociacao', 71_300, 65],
  ['Análise de gesso — contrato anual', 'cli-016', 'lead', 38_900, 15],
  ['Fertilidade pós-colheita', 'cli-013', 'ganho', 67_500, 100],
  ['Nematoides — mapeamento 900 ha', 'cli-007', 'perdido', 52_100, 0],
  ['Bromatologia de silagem — confinamento', 'cli-018', 'proposta', 33_400, 45],
  ['Cromatografia de resíduos — exportação', 'cli-003', 'negociacao', 128_700, 60],
  ['Qualidade de sementes — certificação', 'cli-006', 'contato', 89_200, 35],
].map(([titulo, clienteId, estagio, valor, probabilidade], i) => ({
  id: `opp-${String(i + 1).padStart(3, '0')}`,
  titulo: titulo as string,
  clienteId: clienteId as string,
  estagio: estagio as Oportunidade['estagio'],
  valor: valor as number,
  probabilidade: probabilidade as number,
  previsaoFechamento: diasAFrente(inteiro(-20, 110)),
  responsavelId: escolher(comerciais).id,
  criadaEm: diasAtras(inteiro(20, 180)),
  ultimaInteracao: diasAtras(inteiro(0, 25)),
  origem: escolher(['Indicação', 'Feira Bahia Farm Show', 'Inbound — site', 'Carteira ativa', 'Prospecção fria']),
}));

export const interacoes: Interacao[] = oportunidades.flatMap((o, i) =>
  Array.from({ length: inteiro(1, 3) }, (_, k) => ({
    id: `int-${i}-${k}`,
    clienteId: o.clienteId,
    oportunidadeId: o.id,
    tipo: escolher(['ligacao', 'email', 'visita', 'whatsapp', 'reuniao'] as const),
    resumo: escolher([
      'Apresentada a proposta revisada com desconto por volume.',
      'Cliente pediu prazo de 5 dias úteis para ensaios de acidez.',
      'Visita técnica à fazenda; coletadas 40 amostras de referência.',
      'Enviado modelo de laudo e escopo de acreditação.',
      'Alinhado cronograma de coleta com a equipe agronômica.',
      'Negociada condição de pagamento para 30/60 DDL.',
    ]),
    data: diasAtras(inteiro(0, 60), inteiro(8, 18)),
    autorId: o.responsavelId,
  })),
);

/* ---------------- Equipamentos e calibrações ---------------- */

export const equipamentos: Equipamento[] = [
  {
    id: 'eq-phm-01', tag: 'PHM-01', nome: 'Potenciômetro de bancada — Acidez I',
    fabricante: 'Mettler Toledo', modelo: 'SevenExcellence S400', numeroSerie: 'B948271344',
    tipo: 'phmetro', unidadeId: 'un-13', setor: 'Bancada de Acidez', protocolo: 'mettler',
    baudRate: 9600, ativo: true, dataAquisicao: diasAtras(880), proximaManutencao: diasAFrente(74),
    eletrodo: { id: 'el-01', modelo: 'InLab Expert Pro-ISM', numeroSerie: 'EL-77213', dataInstalacao: diasAtras(164), vidaUtilMeses: 18 },
  },
  {
    id: 'eq-phm-02', tag: 'PHM-02', nome: 'Potenciômetro de bancada — Acidez II',
    fabricante: 'Digimed', modelo: 'DM-22', numeroSerie: 'DG2290871',
    tipo: 'phmetro', unidadeId: 'un-13', setor: 'Bancada de Acidez', protocolo: 'digimed',
    baudRate: 4800, ativo: true, dataAquisicao: diasAtras(1340), proximaManutencao: diasAFrente(21),
    eletrodo: { id: 'el-02', modelo: 'DME-CV1', numeroSerie: 'EL-55108', dataInstalacao: diasAtras(402), vidaUtilMeses: 18 },
  },
  {
    id: 'eq-phm-03', tag: 'PHM-03', nome: 'Potenciômetro — Úmidos e efluentes',
    fabricante: 'Hanna Instruments', modelo: 'HI-5221', numeroSerie: 'HI52-004419',
    tipo: 'phmetro', unidadeId: 'un-13', setor: 'Físico-Química', protocolo: 'hanna',
    baudRate: 9600, ativo: true, dataAquisicao: diasAtras(540), proximaManutencao: diasAFrente(132),
    eletrodo: { id: 'el-03', modelo: 'HI-1131B', numeroSerie: 'EL-91002', dataInstalacao: diasAtras(58), vidaUtilMeses: 24 },
  },
  {
    id: 'eq-phm-04', tag: 'PHM-04', nome: 'Potenciômetro portátil — Campo',
    fabricante: 'Tecnal', modelo: 'TEC-51', numeroSerie: 'TC5180322',
    tipo: 'phmetro', unidadeId: 'un-07', setor: 'Apoio de campo', protocolo: 'tecnal',
    baudRate: 9600, ativo: true, dataAquisicao: diasAtras(290), proximaManutencao: diasAFrente(8),
    eletrodo: { id: 'el-04', modelo: 'Sensoglass SC-09', numeroSerie: 'EL-33470', dataInstalacao: diasAtras(610), vidaUtilMeses: 18 },
  },
  { id: 'eq-bal-01', tag: 'BAL-01', nome: 'Balança analítica', fabricante: 'Shimadzu', modelo: 'AUY220', numeroSerie: 'SH2208841', tipo: 'balanca', unidadeId: 'un-13', setor: 'Pesagem', ativo: true, dataAquisicao: diasAtras(1100), proximaManutencao: diasAFrente(45) },
  { id: 'eq-est-01', tag: 'EST-01', nome: 'Estufa de secagem 100 L', fabricante: 'Marconi', modelo: 'MA033', numeroSerie: 'MC0339912', tipo: 'estufa', unidadeId: 'un-13', setor: 'Preparo', ativo: true, dataAquisicao: diasAtras(1600), proximaManutencao: diasAFrente(-6) },
  { id: 'eq-esp-01', tag: 'ESP-01', nome: 'Espectrofotômetro UV-Vis', fabricante: 'Thermo Fisher', modelo: 'Genesys 150', numeroSerie: 'TF1500277', tipo: 'espectrofotometro', unidadeId: 'un-13', setor: 'Físico-Química', ativo: true, dataAquisicao: diasAtras(760), proximaManutencao: diasAFrente(96) },
  { id: 'eq-agi-01', tag: 'AGI-01', nome: 'Mesa agitadora orbital 30 provas', fabricante: 'Marconi', modelo: 'MA140', numeroSerie: 'MC1404456', tipo: 'agitador', unidadeId: 'un-13', setor: 'Bancada de Acidez', ativo: true, dataAquisicao: diasAtras(980), proximaManutencao: diasAFrente(60) },
];

export const phmetros = equipamentos.filter((e) => e.tipo === 'phmetro');

/** Perfil de desgaste de cada eletrodo, para gerar históricos coerentes. */
const PERFIL_ELETRODO: Record<string, { slope: number; offset: number }> = {
  'eq-phm-01': { slope: 99.1, offset: -2.4 },
  'eq-phm-02': { slope: 96.4, offset: 11.8 },
  'eq-phm-03': { slope: 99.6, offset: -1.1 },
  'eq-phm-04': { slope: 94.2, offset: 26.5 },
};

function gerarCalibracao(eq: Equipamento, diasNoPassado: number, indice: number): Calibracao {
  const perfil = PERFIL_ELETRODO[eq.id] ?? { slope: 98, offset: 0 };
  // o eletrodo perde slope e ganha offset com o tempo
  const envelhecimento = diasNoPassado / 120;
  const slopeAlvo = perfil.slope + envelhecimento * 1.6 + entre(-0.4, 0.4);
  const offsetAlvo = perfil.offset - envelhecimento * 3.2 + entre(-1.2, 1.2);
  const temperatura = entre(22.5, 26.5);

  const slopeMv = (slopeAlvo / 100) * 59.16;
  const pontos = [4.01, 7.0, 10.01].map((tampao) => ({
    tampao,
    mV: offsetAlvo - slopeMv * (tampao - 7) + entre(-0.3, 0.3),
    temperatura: temperatura + entre(-0.2, 0.2),
    lote: `TP${tampao.toFixed(2).replace('.', '')}-${inteiro(2200, 2599)}`,
  }));

  const r = calcularCalibracao(pontos);
  const data = diasAtras(diasNoPassado, inteiro(7, 9));
  const validade = new Date(data);
  validade.setHours(validade.getHours() + 12);

  return {
    id: `cal-${eq.id}-${indice}`,
    equipamentoId: eq.id,
    analistaId: escolher(usuarios.filter((u) => u.papelId === 'papel-analista')).id,
    data,
    pontos,
    slopePercentual: r.slopePercentual,
    offsetMv: r.offsetMv,
    slopeMvPorPh: r.slopeMvPorPh,
    r2: r.r2,
    status: diasNoPassado === 0 ? (r.aprovada ? 'valida' : 'reprovada') : 'vencida',
    validaAte: validade.toISOString(),
    observacao: r.avisos[0],
  };
}

export const calibracoes: Calibracao[] = phmetros.flatMap((eq) =>
  [0, 1, 2, 3, 5, 7, 9, 12, 15, 20, 26, 33].map((d, i) => gerarCalibracao(eq, d, i)),
);

/** Calibração vigente de cada pHmetro. */
export const calibracaoVigente = new Map<string, Calibracao>(
  phmetros.map((eq) => [
    eq.id,
    calibracoes.filter((c) => c.equipamentoId === eq.id)
      .sort((a, b) => +new Date(b.data) - +new Date(a.data))[0],
  ]),
);

/* ---------------- Amostras, ensaios e leituras ---------------- */

const FAZENDAS = ['Serra Azul', 'Boa Esperança', 'Três Marias', 'Nova Canaã', 'Campo Belo', 'Santa Rita', 'Alto da Serra', 'Vale Verde', 'Rio Preto', 'Chapadão'];
const TALHOES = ['T-01', 'T-02', 'T-03', 'T-04A', 'T-04B', 'T-07', 'T-11', 'T-12', 'T-15', 'T-22', 'Pivô 3', 'Pivô 8'];
const CULTURAS = ['Soja', 'Milho 2ª safra', 'Algodão', 'Cana-de-açúcar', 'Café', 'Pastagem', 'Feijão', 'Sorgo'];
const PROFUNDIDADES = ['0-20 cm', '20-40 cm', '40-60 cm', '0-10 cm'];

/**
 * O status acompanha a idade da amostra: o que entrou hoje está na
 * recepção, o que passou do prazo já saiu em laudo. Sortear status de
 * forma uniforme produziria centenas de amostras eternamente atrasadas —
 * um acervo que nenhum laboratório real teria.
 */
function sortearStatus(diasDesdeRecepcao: number, prazoDias: number): StatusAmostra {
  const avanco = diasDesdeRecepcao / Math.max(1, prazoDias);
  const r = rnd();

  if (diasDesdeRecepcao < 1) return r < 0.7 ? 'recebida' : 'preparo';
  if (avanco < 0.25) return r < 0.45 ? 'preparo' : 'em-analise';
  if (avanco < 0.7) return r < 0.75 ? 'em-analise' : 'aguardando-revisao';
  if (avanco < 1) {
    if (r < 0.45) return 'em-analise';
    if (r < 0.85) return 'aguardando-revisao';
    return 'liberada';
  }
  // Passou do prazo: quase tudo já saiu. O resto é o atraso real que o
  // painel precisa destacar — poucas dezenas, não centenas.
  if (r < 0.965) return 'liberada';
  if (r < 0.983) return 'aguardando-revisao';
  if (r < 0.991) return 'em-analise';
  return 'cancelada';
}

const GRUPOS_FREQUENTES: GrupoAnaliseId[] = [
  'solo', 'solo', 'solo', 'solo', 'solo', 'foliar', 'foliar', 'agua-efluentes',
  'corretivos-agricolas', 'fertilizantes', 'derivados-cana', 'compostos-organicos',
  'seiva', 'sementes', 'nematoides', 'gesso', 'bromatologia', 'produtos-biologicos',
];

export const lotesRecepcao: LoteRecepcao[] = [];
export const amostras: Amostra[] = [];
export const ensaios: Ensaio[] = [];
export const leiturasPh: LeituraPh[] = [];

const recepcionistas = usuarios.filter((u) => u.papelId === 'papel-recepcao');
const analistas = usuarios.filter((u) => u.papelId === 'papel-analista');
const revisores = usuarios.filter((u) => u.papelId === 'papel-rt');

/** Gera o trace de estabilização que o potenciômetro produziria. */
function gerarTrace(phVerdadeiro: number, temperatura: number, calib: Calibracao): PontoTrace[] {
  const tau = entre(4, 9);
  const eFinal = mvDePh(phVerdatoSafe(phVerdadeiro), temperatura, calib);
  const eInicial = eFinal + entre(25, 60) * (chance(0.5) ? 1 : -1);
  const duracao = Math.ceil(tau * 4 + entre(2, 8));
  const pontos: PontoTrace[] = [];
  for (let t = 0; t <= duracao; t += 1) {
    const mV = eFinal + (eInicial - eFinal) * Math.exp(-t / tau) + entre(-0.25, 0.25);
    pontos.push({
      t,
      mV,
      ph: phDeMv(mV, temperatura, calib),
      temperatura: temperatura + Math.sin(t / 9) * 0.06,
    });
  }
  return pontos;
}
function phVerdatoSafe(v: number) { return Math.min(13.5, Math.max(2.5, v)); }

/** pH plausível conforme a matriz analisada. */
function phTipico(grupoId: GrupoAnaliseId, extrator: string): number {
  if (extrator === 'SMP') return entre(4.9, 6.8);
  if (extrator === 'CaCl2') return entre(3.9, 6.4);
  if (grupoId === 'agua-efluentes') return entre(5.2, 8.6);
  if (grupoId === 'corretivos-agricolas') return entre(8.4, 10.1);
  if (grupoId === 'derivados-cana') return entre(4.6, 5.9);
  if (grupoId === 'compostos-organicos') return entre(6.4, 8.3);
  if (grupoId === 'fertilizantes') return entre(3.2, 7.4);
  if (grupoId === 'seiva') return entre(5.4, 6.7);
  return entre(4.2, 6.9); // solo em água
}

let seqProtocolo = 14_200;
const ano = String(HOJE.getFullYear()).slice(2);

for (let l = 0; l < 120; l++) {
  const cliente = escolher(clientes.filter((c) => c.ativo));
  const diasAtrasRecepcao = inteiro(0, 115);
  const qtd = inteiro(2, 14);

  const lote: LoteRecepcao = {
    id: `rec-${String(l + 1).padStart(3, '0')}`,
    numero: `REC-${HOJE.getFullYear()}-${String(820 + l).padStart(4, '0')}`,
    clienteId: cliente.id,
    dataRecepcao: diasAtras(diasAtrasRecepcao, inteiro(8, 16)),
    recebidoPorId: escolher(recepcionistas).id,
    quantidadeAmostras: qtd,
    notaFiscalRemessa: chance(0.6) ? String(inteiro(100_000, 999_999)) : undefined,
    transportadora: escolher(['Correios SEDEX', 'Braspress', 'Entrega própria', 'Jadlog', 'Rodonaves']),
    observacoes: chance(0.15) ? 'Embalagem com sinal de umidade; registrada ocorrência na entrada.' : undefined,
  };
  lotesRecepcao.push(lote);

  const grupoLote = escolher(GRUPOS_FREQUENTES);
  const grupo = grupos.find((g) => g.id === grupoLote)!;

  for (let a = 0; a < qtd; a++) {
    const status = sortearStatus(diasAtrasRecepcao, grupo.prazoPadraoDias);
    const fazenda = escolher(FAZENDAS);
    const amostra: Amostra = {
      id: `am-${String(amostras.length + 1).padStart(4, '0')}`,
      protocolo: `${ano}.${String(++seqProtocolo).padStart(6, '0')}`,
      loteRecepcaoId: lote.id,
      clienteId: cliente.id,
      grupoId: grupoLote,
      unidadeId: cliente.uf === 'MT' ? 'un-07' : 'un-13',
      identificacaoCampo: grupoLote === 'solo' || grupoLote === 'foliar'
        ? `${fazenda} / ${escolher(TALHOES)}`
        : `${escolher(['Amostra', 'Lote', 'Ponto'])} ${inteiro(1, 60)}`,
      fazenda: grupoLote === 'solo' || grupoLote === 'foliar' ? fazenda : undefined,
      talhao: grupoLote === 'solo' ? escolher(TALHOES) : undefined,
      profundidade: grupoLote === 'solo' ? escolher(PROFUNDIDADES) : undefined,
      cultura: ['solo', 'foliar', 'seiva', 'nematoides'].includes(grupoLote) ? escolher(CULTURAS) : undefined,
      dataColeta: diasAtras(diasAtrasRecepcao + inteiro(1, 6)),
      dataRecepcao: lote.dataRecepcao,
      prazoEntrega: diasAtras(diasAtrasRecepcao - grupo.prazoPadraoDias),
      status,
      prioridade: chance(0.12) ? (chance(0.3) ? 'emergencial' : 'urgente') : 'normal',
      massaRecebida: grupoLote === 'agua-efluentes' ? undefined : inteiro(180, 620),
      temperaturaRecebimento: grupoLote === 'agua-efluentes' ? entre(3.2, 9.4) : undefined,
      conformeNoRecebimento: !chance(0.07),
      naoConformidade: undefined,
      posicaoBandeja: `B${String(inteiro(1, 24)).padStart(2, '0')}-${String(inteiro(1, 40)).padStart(2, '0')}`,
    };
    if (!amostra.conformeNoRecebimento) {
      amostra.naoConformidade = escolher([
        'Massa insuficiente para o escopo solicitado.',
        'Identificação de campo ilegível na embalagem.',
        'Frasco sem preservante para a matriz água.',
        'Amostra recebida acima da temperatura de conservação.',
      ]);
    }
    amostras.push(amostra);

    // --- Ensaios da amostra: vêm do pacote contratado ---
    const pacotes = tiposPorGrupo.get(grupoLote) ?? [];
    const pacote = pacotes.length ? escolher(pacotes) : undefined;
    amostra.tipoAnaliseId = pacote?.id;

    const doGrupo = parametros.filter((p) => p.grupoId === grupoLote);
    const selecionados = pacote
      ? pacote.parametroIds.map((id) => parametros.find((p) => p.id === id)!).filter(Boolean)
      : doGrupo;

    for (const par of selecionados) {
      const statusEnsaio: Ensaio['status'] =
        status === 'liberada' ? 'aprovado'
        : status === 'aguardando-revisao' ? (chance(0.6) ? 'revisado' : 'lido')
        : status === 'em-analise' ? escolher(['em-bancada', 'lido', 'pendente'] as const)
        : status === 'cancelada' ? 'pendente'
        : 'pendente';

      const analista = escolher(analistas);
      const ensaio: Ensaio = {
        id: `ens-${String(ensaios.length + 1).padStart(5, '0')}`,
        amostraId: amostra.id,
        parametroId: par.id,
        status: statusEnsaio,
        unidade: par.unidade,
        analistaId: statusEnsaio === 'pendente' ? undefined : analista.id,
        revisorId: ['revisado', 'aprovado'].includes(statusEnsaio) ? escolher(revisores).id : undefined,
        dataLeitura: statusEnsaio === 'pendente' ? undefined : diasAtras(Math.max(0, diasAtrasRecepcao - inteiro(1, 4)), inteiro(8, 17)),
        dataAprovacao: statusEnsaio === 'aprovado' ? diasAtras(Math.max(0, diasAtrasRecepcao - inteiro(0, 2)), inteiro(14, 18)) : undefined,
      };

      if (statusEnsaio !== 'pendente' && statusEnsaio !== 'em-bancada') {
        if (par.ehPh) {
          const eq = escolher(phmetros.filter((e) => e.unidadeId === amostra.unidadeId));
          const calib = calibracaoVigente.get(eq.id)!;
          const temperatura = entre(21.8, 27.4);
          const phVerdadeiro = phTipico(grupoLote, par.extrator ?? 'H2O');
          const trace = gerarTrace(phVerdadeiro, temperatura, calib);
          const ultimo = trace[trace.length - 1];
          const phCorrigido = corrigirPara25C(ultimo.ph, temperatura, par.extrator ?? 'H2O');

          const leitura: LeituraPh = {
            id: `lph-${String(leiturasPh.length + 1).padStart(5, '0')}`,
            ensaioId: ensaio.id,
            amostraId: amostra.id,
            parametroId: par.id,
            equipamentoId: eq.id,
            calibracaoId: calib.id,
            analistaId: analista.id,
            origem: chance(0.78) ? 'instrumento' : chance(0.5) ? 'manual' : 'importacao',
            mV: ultimo.mV,
            temperatura,
            phBruto: ultimo.ph,
            phCorrigido,
            derivaMvPorMin: entre(0.05, 0.55),
            estavel: true,
            tempoEstabilizacaoS: ultimo.t,
            extrator: (par.extrator ?? 'H2O') as LeituraPh['extrator'],
            proporcao: par.proporcao ?? '1:2,5',
            dataHora: ensaio.dataLeitura!,
            trace: leiturasPh.length < 160 ? trace : undefined,
          };
          leiturasPh.push(leitura);

          ensaio.valor = Number(phCorrigido.toFixed(par.casasDecimais));
          ensaio.leituraPhId = leitura.id;
        } else {
          const base = par.codigo === 'MO' ? entre(8, 42)
            : par.codigo === 'P-MEL' ? entre(2, 48)
            : par.codigo === 'K' ? entre(28, 190)
            : par.codigo === 'V' ? entre(22, 78)
            : par.codigo === 'PRNT' ? entre(62, 94)
            : par.codigo === 'GERM' ? entre(72, 99)
            : par.codigo === 'NEMA' ? entre(0, 1800)
            : entre(0.4, 24);
          ensaio.valor = Number(base.toFixed(par.casasDecimais));
        }

        if (par.limiteInferior !== undefined && ensaio.valor !== undefined) {
          ensaio.foraDeFaixa = ensaio.valor < par.limiteInferior || ensaio.valor > (par.limiteSuperior ?? Infinity);
        }
      }

      ensaios.push(ensaio);
    }
  }
}

/* ---------------- Controle de qualidade ---------------- */

export const amostrasControle: AmostraControle[] = [
  { id: 'cq-01', nome: 'MRC Solo — pH 5,52', tipo: 'mrc', valorAlvo: 5.52, desvioPadrao: 0.05, lote: 'IAG-2281', validade: diasAFrente(210), grupoId: 'solo' },
  { id: 'cq-02', nome: 'MRC Solo alcalino — pH 7,41', tipo: 'mrc', valorAlvo: 7.41, desvioPadrao: 0.04, lote: 'IAG-2284', validade: diasAFrente(180), grupoId: 'solo' },
  { id: 'cq-03', nome: 'Controle interno água — pH 6,88', tipo: 'controle-interno', valorAlvo: 6.88, desvioPadrao: 0.03, lote: 'CI-0912', validade: diasAFrente(64), grupoId: 'agua-efluentes' },
  { id: 'cq-04', nome: 'Branco de reagente', tipo: 'branco', valorAlvo: 7.0, desvioPadrao: 0.06, lote: 'BR-0441', validade: diasAFrente(30), grupoId: 'solo' },
];

export const registrosCQ: RegistroCQ[] = [];
for (const ctrl of amostrasControle) {
  const serie: number[] = [];
  // tendência leve introduzida no PHM-02, que é o eletrodo mais gasto
  for (let d = 34; d >= 0; d--) {
    const eq = escolher(phmetros.filter((e) => e.unidadeId === 'un-13'));
    const tendencia = eq.id === 'eq-phm-02' ? (34 - d) * 0.0016 : 0;
    const valor = ctrl.valorAlvo + tendencia + (rnd() + rnd() + rnd() - 1.5) * ctrl.desvioPadrao * 1.1;
    serie.push(valor);
    const av = avaliarCQ(serie, ctrl.valorAlvo, ctrl.desvioPadrao);
    registrosCQ.push({
      id: `rcq-${ctrl.id}-${d}`,
      controleId: ctrl.id,
      equipamentoId: eq.id,
      analistaId: escolher(analistas).id,
      data: diasAtras(d, inteiro(8, 10)),
      valorMedido: valor,
      zScore: av.zScore,
      resultado: av.resultado,
      regraViolada: av.regraViolada,
    });
  }
}

/* ---------------- Laudos ---------------- */

const amostrasLiberadas = amostras.filter((a) => a.status === 'liberada');
export const laudos: Laudo[] = [];
{
  const porLote = new Map<string, Amostra[]>();
  for (const a of amostrasLiberadas) {
    const arr = porLote.get(a.loteRecepcaoId) ?? [];
    arr.push(a);
    porLote.set(a.loteRecepcaoId, arr);
  }
  let n = 3100;
  for (const [loteId, lista] of porLote) {
    const lote = lotesRecepcao.find((l) => l.id === loteId)!;
    const emitido = chance(0.82);
    laudos.push({
      id: `lau-${String(laudos.length + 1).padStart(4, '0')}`,
      numero: `LA-${HOJE.getFullYear()}-${String(++n).padStart(5, '0')}`,
      clienteId: lote.clienteId,
      amostraIds: lista.map((a) => a.id),
      grupoId: lista[0].grupoId,
      status: emitido ? 'emitido' : chance(0.5) ? 'aguardando-assinatura' : 'rascunho',
      emitidoEm: emitido ? diasAtras(inteiro(0, 100), inteiro(10, 18)) : undefined,
      assinadoPorId: emitido ? escolher(revisores).id : undefined,
      versao: chance(0.1) ? 2 : 1,
      hashDocumento: emitido ? Array.from({ length: 12 }, () => '0123456789abcdef'[inteiro(0, 15)]).join('') : undefined,
      enviadoEmail: emitido && chance(0.85),
    });
  }
}

/* ---------------- Comercial ---------------- */

export const orcamentos: Orcamento[] = oportunidades.slice(0, 9).map((o, i) => {
  const grupo = escolher(grupos);
  const qtd = inteiro(40, 600);
  const unitario = entre(38, 140);
  return {
    id: `orc-${String(i + 1).padStart(3, '0')}`,
    numero: `ORC-${HOJE.getFullYear()}-${String(410 + i).padStart(4, '0')}`,
    clienteId: o.clienteId,
    oportunidadeId: o.id,
    status: o.estagio === 'ganho' ? 'aprovado' : o.estagio === 'perdido' ? 'recusado'
      : o.estagio === 'negociacao' ? 'enviado' : chance(0.5) ? 'enviado' : 'rascunho',
    emitidoEm: diasAtras(inteiro(5, 90)),
    validoAte: diasAFrente(inteiro(-10, 40)),
    itens: [{
      grupoId: grupo.id,
      descricao: `Pacote ${grupo.nome} — escopo completo`,
      quantidade: qtd,
      valorUnitario: unitario,
    }],
    desconto: escolher([0, 5, 10, 12, 18]),
    total: qtd * unitario,
    responsavelId: o.responsavelId,
  };
});

/* ---------------- Financeiro e fiscal ---------------- */

export const titulos: Titulo[] = [];
export const notasFiscais: NotaFiscal[] = [];

const CATEGORIAS_RECEITA = ['Análises de solo', 'Análises foliares', 'Análises de água', 'Corretivos e fertilizantes', 'Sementes e sanidade'];
const DESPESAS: Array<[string, string, number, number]> = [
  ['Energia elétrica — CELPE', 'Utilidades', 9_200, 16_400],
  ['Reagentes e padrões analíticos', 'Insumos de laboratório', 18_000, 42_000],
  ['Folha de pagamento', 'Pessoal', 148_000, 172_000],
  ['Aluguel do galpão', 'Ocupação', 22_000, 22_000],
  ['Manutenção de equipamentos', 'Manutenção', 3_400, 14_800],
  ['Software e licenças', 'TI', 2_800, 5_200],
  ['Descarte de resíduos químicos', 'Ambiental', 4_100, 9_600],
  ['Ensaios subcontratados', 'Terceiros', 6_500, 28_000],
  ['Frete e logística de amostras', 'Logística', 5_200, 13_400],
];

let seqNota = 2840;
for (const laudo of laudos.filter((l) => l.status === 'emitido')) {
  const cliente = clientes.find((c) => c.id === laudo.clienteId)!;
  const valor = laudo.amostraIds.length * entre(52, 190);
  const emissao = laudo.emitidoEm!;
  const aliquotaIss = escolher([2, 3, 5]);

  const apuracao = apurarNotaServico({
    valorServicos: valor,
    aliquotaIss,
    issRetido: chance(0.25),
    regime: 'presumido',
    tomadorPessoaJuridica: true,
  });

  const statusNota: NotaFiscal['status'] = chance(0.92) ? 'autorizada' : chance(0.5) ? 'rejeitada' : 'em-processamento';
  const nota: NotaFiscal = {
    id: `nf-${String(notasFiscais.length + 1).padStart(4, '0')}`,
    modelo: 'NFS-e',
    numero: String(++seqNota),
    serie: 'A1',
    clienteId: cliente.id,
    emissao,
    competencia: emissao.slice(0, 7),
    status: statusNota,
    codigoServico: '17.09',
    discriminacao: `Prestação de serviços de análise laboratorial — laudo ${laudo.numero} (${laudo.amostraIds.length} amostras).`,
    valorServicos: Number(valor.toFixed(2)),
    deducoes: 0,
    baseCalculo: apuracao.baseCalculo,
    aliquotaIss,
    valorIss: apuracao.valorIss,
    issRetido: apuracao.notas.some((n) => n.includes('ISS retido')),
    valorIr: apuracao.valorIr,
    valorPis: apuracao.valorPis,
    valorCofins: apuracao.valorCofins,
    valorCsll: apuracao.valorCsll,
    valorInss: apuracao.valorInss,
    valorLiquido: apuracao.valorLiquido,
    chaveAcesso: statusNota === 'autorizada'
      ? Array.from({ length: 44 }, () => String(inteiro(0, 9))).join('') : undefined,
    protocoloAutorizacao: statusNota === 'autorizada' ? `135${inteiro(10_000_000_000, 99_999_999_999)}` : undefined,
    motivoRejeicao: statusNota === 'rejeitada'
      ? escolher(['E145 — Código de serviço incompatível com a atividade do prestador', 'E221 — Inscrição municipal do tomador inválida'])
      : undefined,
    laudoIds: [laudo.id],
  };
  notasFiscais.push(nota);

  if (statusNota === 'autorizada') {
    const venc = new Date(emissao);
    venc.setDate(venc.getDate() + inteiro(14, 45));
    const vencido = venc < HOJE;
    const pago = vencido ? chance(0.82) : chance(0.2);

    titulos.push({
      id: `tit-r-${String(titulos.length + 1).padStart(4, '0')}`,
      tipo: 'receber',
      numero: `REC${nota.numero}`,
      clienteId: cliente.id,
      descricao: `NFS-e ${nota.numero} — ${laudo.numero}`,
      categoria: escolher(CATEGORIAS_RECEITA),
      emissao,
      vencimento: venc.toISOString(),
      pagamento: pago ? new Date(+venc + inteiro(-4, 9) * 86_400_000).toISOString() : undefined,
      valor: nota.valorLiquido,
      valorPago: pago ? nota.valorLiquido : 0,
      status: pago ? 'pago' : vencido ? 'vencido' : 'aberto',
      formaPagamento: pago ? escolher(['boleto', 'pix', 'transferencia'] as const) : undefined,
      notaFiscalId: nota.id,
    });
  }
}

for (let m = 0; m < 5; m++) {
  for (const [descricao, categoria, min, max] of DESPESAS) {
    const venc = new Date(HOJE);
    venc.setMonth(venc.getMonth() - m, inteiro(5, 25));
    const vencido = venc < HOJE;
    const valor = entre(min, max);
    titulos.push({
      id: `tit-p-${String(titulos.length + 1).padStart(4, '0')}`,
      tipo: 'pagar',
      numero: `PAG${inteiro(10_000, 99_999)}`,
      fornecedor: descricao.includes('—') ? descricao.split('—')[1].trim() : 'Diversos',
      descricao,
      categoria,
      emissao: new Date(+venc - 20 * 86_400_000).toISOString(),
      vencimento: venc.toISOString(),
      pagamento: vencido && chance(0.93) ? venc.toISOString() : undefined,
      valor: Number(valor.toFixed(2)),
      valorPago: vencido && chance(0.93) ? Number(valor.toFixed(2)) : 0,
      status: vencido ? (chance(0.93) ? 'pago' : 'vencido') : 'aberto',
      formaPagamento: escolher(['boleto', 'pix', 'transferencia'] as const),
    });
  }
}

/* ---------------- Estoque ---------------- */

export const itensEstoque: ItemEstoque[] = [
  { id: 'est-01', codigo: 'TP-401', nome: 'Solução tampão pH 4,01 rastreável NIST', classe: 'tampao', fabricante: 'Merck', unidadeMedida: 'L', saldo: 14.5, estoqueMinimo: 8, localizacao: 'Armário A2 · prat. 1', custoUnitario: 98.4, controlado: false },
  { id: 'est-02', codigo: 'TP-700', nome: 'Solução tampão pH 7,00 rastreável NIST', classe: 'tampao', fabricante: 'Merck', unidadeMedida: 'L', saldo: 6.2, estoqueMinimo: 8, localizacao: 'Armário A2 · prat. 1', custoUnitario: 98.4, controlado: false },
  { id: 'est-03', codigo: 'TP-1001', nome: 'Solução tampão pH 10,01 rastreável NIST', classe: 'tampao', fabricante: 'Merck', unidadeMedida: 'L', saldo: 11.0, estoqueMinimo: 6, localizacao: 'Armário A2 · prat. 1', custoUnitario: 104.2, controlado: false },
  { id: 'est-04', codigo: 'KCL-3M', nome: 'Solução de KCl 3 mol/L para eletrodo', classe: 'padrao', fabricante: 'Dinâmica', unidadeMedida: 'L', saldo: 3.4, estoqueMinimo: 2, localizacao: 'Armário A2 · prat. 2', custoUnitario: 62.0, controlado: false },
  { id: 'est-05', codigo: 'CACL2', nome: 'Cloreto de cálcio di-hidratado P.A.', classe: 'padrao', fabricante: 'Synth', unidadeMedida: 'kg', saldo: 12.8, estoqueMinimo: 5, localizacao: 'Armário B1', custoUnitario: 148.0, controlado: false },
  { id: 'est-06', codigo: 'HCL-37', nome: 'Ácido clorídrico 37% P.A.', classe: 'acido', fabricante: 'Êxodo', unidadeMedida: 'L', saldo: 18.0, estoqueMinimo: 10, localizacao: 'Capela · armário corrosivos', custoUnitario: 74.5, controlado: true },
  { id: 'est-07', codigo: 'NAOH', nome: 'Hidróxido de sódio em lentilhas P.A.', classe: 'base', fabricante: 'Synth', unidadeMedida: 'kg', saldo: 9.4, estoqueMinimo: 6, localizacao: 'Armário B2', custoUnitario: 86.0, controlado: false },
  { id: 'est-08', codigo: 'H2SO4', nome: 'Ácido sulfúrico 98% P.A.', classe: 'acido', fabricante: 'Êxodo', unidadeMedida: 'L', saldo: 4.2, estoqueMinimo: 8, localizacao: 'Capela · armário corrosivos', custoUnitario: 92.0, controlado: true },
  { id: 'est-09', codigo: 'MEHL-1', nome: 'Extrator Mehlich-1 pré-preparado', classe: 'solvente', fabricante: 'Preparo interno', unidadeMedida: 'L', saldo: 42.0, estoqueMinimo: 20, localizacao: 'Bancada de extração', custoUnitario: 11.2, controlado: false },
  { id: 'est-10', codigo: 'SMP-BUF', nome: 'Solução tampão SMP', classe: 'tampao', fabricante: 'Preparo interno', unidadeMedida: 'L', saldo: 16.5, estoqueMinimo: 10, localizacao: 'Bancada de acidez', custoUnitario: 24.8, controlado: false },
  { id: 'est-11', codigo: 'COP-50', nome: 'Copo plástico descartável 50 mL', classe: 'consumivel', fabricante: 'Cralplast', unidadeMedida: 'un', saldo: 2400, estoqueMinimo: 1500, localizacao: 'Almoxarifado', custoUnitario: 0.18, controlado: false },
  { id: 'est-12', codigo: 'BEQ-100', nome: 'Béquer de vidro borossilicato 100 mL', classe: 'vidraria', fabricante: 'Laborglas', unidadeMedida: 'un', saldo: 86, estoqueMinimo: 60, localizacao: 'Almoxarifado', custoUnitario: 14.9, controlado: false },
];

export const lotesReagente: LoteReagente[] = itensEstoque.flatMap((item, i) =>
  Array.from({ length: inteiro(1, 2) }, (_, k) => ({
    id: `lot-${i}-${k}`,
    itemId: item.id,
    lote: `${item.codigo}-${inteiro(2200, 2599)}`,
    validade: diasAFrente(inteiro(-20, 540)),
    quantidade: Number((item.saldo / (k + 1)).toFixed(2)),
    aberto: k === 0,
    abertoEm: k === 0 ? diasAtras(inteiro(2, 80)) : undefined,
  })),
);

export const movimentosEstoque: MovimentoEstoque[] = Array.from({ length: 60 }, (_, i) => {
  const item = escolher(itensEstoque);
  const tipo = escolher(['saida', 'saida', 'saida', 'entrada', 'ajuste', 'descarte'] as const);
  return {
    id: `mov-${String(i + 1).padStart(3, '0')}`,
    itemId: item.id,
    tipo,
    quantidade: Number(entre(0.2, item.unidadeMedida === 'un' ? 120 : 4).toFixed(2)),
    data: diasAtras(inteiro(0, 50), inteiro(8, 17)),
    usuarioId: escolher(analistas).id,
    motivo: tipo === 'saida' ? 'Consumo em bancada de acidez'
      : tipo === 'entrada' ? `NF de compra ${inteiro(10_000, 99_999)}`
      : tipo === 'descarte' ? 'Lote vencido — descarte conforme PGRS'
      : 'Ajuste de inventário cíclico',
  };
});

/* ---------------- Auditoria ---------------- */

export const auditoria: RegistroAuditoria[] = Array.from({ length: 70 }, (_, i) => {
  const u = escolher(usuarios);
  const [acao, entidade, detalhe] = escolher([
    ['Aprovou resultado', 'Ensaio', 'pH em água aprovado após revisão técnica'],
    ['Registrou leitura', 'LeituraPh', 'Captura automática do PHM-01, leitura estável em 23 s'],
    ['Calibrou equipamento', 'Calibracao', 'Calibração de 3 pontos — slope 98,7%'],
    ['Emitiu laudo', 'Laudo', 'Laudo assinado digitalmente e enviado ao cliente'],
    ['Alterou permissão', 'Papel', 'Permissão fiscal:aprovar concedida ao Financeiro'],
    ['Cancelou amostra', 'Amostra', 'Cancelada a pedido do cliente antes do preparo'],
    ['Emitiu NFS-e', 'NotaFiscal', 'Nota autorizada pela prefeitura'],
    ['Repetiu ensaio', 'Ensaio', 'Repetição por RSD entre réplicas acima de 2%'],
    ['Reprovou calibração', 'Calibracao', 'Slope fora do critério — eletrodo enviado para manutenção'],
  ] as const);
  return {
    id: `aud-${String(i + 1).padStart(3, '0')}`,
    data: diasAtras(inteiro(0, 30), inteiro(7, 19)),
    usuarioId: u.id,
    acao,
    entidade,
    entidadeId: `#${inteiro(1000, 9999)}`,
    detalhe,
    ip: `10.${inteiro(0, 4)}.${inteiro(1, 254)}.${inteiro(2, 254)}`,
  };
}).sort((a, b) => +new Date(b.data) - +new Date(a.data));

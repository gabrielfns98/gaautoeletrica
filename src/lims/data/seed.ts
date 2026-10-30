/* ============================================================
   BANCADA — massa de dados de demonstração
   Gerador determinístico: a mesma semente produz sempre o
   mesmo laboratório, o que torna telas e gráficos reprodutíveis.
   ============================================================ */

import { PAPEIS_PADRAO } from '../lib/rbac';
import { calcularCalibracao, mvDePh, phDeMv, corrigirPara25C, avaliarCQ, hMaisAlPorSmp } from '../lib/ph';
import { apurarNotaServico } from '../lib/fiscal';
import { ajustarCurva } from '../lib/curva';
import { avaliarVerificacao } from '../lib/equipamento';
import { iniciais } from '../lib/format';
import type {
  Amostra, AmostraControle, Calibracao, Cliente, Contato, Ensaio, Equipamento,
  GrupoAnalise, GrupoAnaliseId, Interacao, ItemEstoque, Laudo, LeituraPh,
  ModeloImportacao, TipoEquipamento, VerificacaoEquipamento,
  LoteReagente, LoteRecepcao, MovimentoEstoque, NotaFiscal, Oportunidade,
  Orcamento, Papel, Parametro, PontoTrace, RegistroAuditoria, RegistroCQ,
  StatusAmostra, TabelaPreco, TipoAnalise, Titulo, Unidade, Usuario,
  Bandeja, Convenio, Curva, Legenda, Metodologia, PontoCurva, RegraDesconto,
  ItemSimples, TipoAjuste, CriterioAceitacao,
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

const AGORA = new Date();
const HOJE = new Date(AGORA);
HOJE.setHours(9, 0, 0, 0);

/** Deslocamento em dias a partir de hoje, sem juízo sobre passado ou futuro. */
function deslocar(d: number, horaDia?: number): Date {
  const dt = new Date(HOJE);
  dt.setDate(dt.getDate() - d);
  if (horaDia !== undefined) dt.setHours(horaDia, inteiro(0, 59), inteiro(0, 59), 0);
  return dt;
}

/**
 * Evento que já aconteceu. A âncora do dia é 9h, mas um lote "de hoje às
 * 16h" sorteado às 10h da manhã cairia no futuro e a tela mostraria
 * "em 6 h" num lote já recebido — então o que passar de agora volta para
 * alguns minutos atrás.
 */
function diasAtras(d: number, horaDia?: number): string {
  const dt = deslocar(d, horaDia);
  return dt.getTime() > AGORA.getTime()
    ? new Date(AGORA.getTime() - inteiro(3, 190) * 60_000).toISOString()
    : dt.toISOString();
}

/** Compromisso adiante — prazo, validade, próxima manutenção. Não se limita. */
function diasAFrente(d: number): string {
  return deslocar(-d).toISOString();
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

  // Enxofre, micronutrientes, sódio e as duas outras leituras de fósforo:
  // nenhum laboratório de solos entrega fertilidade sem eles.
  { id: 'par-s', codigo: 'S', nome: 'Enxofre', grupoId: 'solo', unidade: 'mg/dm³', tipo: 'numerico', metodo: 'Ca(H₂PO₄)₂ 0,01 mol/L + turbidimetria', casasDecimais: 1, preco: 11.5, ativo: true },
  { id: 'par-b', codigo: 'B', nome: 'Boro', grupoId: 'solo', unidade: 'mg/dm³', tipo: 'numerico', metodo: 'Água quente + colorimetria (azometina-H)', casasDecimais: 2, preco: 13.0, ativo: true },
  { id: 'par-cu', codigo: 'CU', nome: 'Cobre', grupoId: 'solo', unidade: 'mg/dm³', tipo: 'numerico', metodo: 'Mehlich-1 + absorção atômica', casasDecimais: 2, preco: 10.5, ativo: true },
  { id: 'par-fe', codigo: 'FE', nome: 'Ferro', grupoId: 'solo', unidade: 'mg/dm³', tipo: 'numerico', metodo: 'Mehlich-1 + absorção atômica', casasDecimais: 1, preco: 10.5, ativo: true },
  { id: 'par-mn', codigo: 'MN', nome: 'Manganês', grupoId: 'solo', unidade: 'mg/dm³', tipo: 'numerico', metodo: 'Mehlich-1 + absorção atômica', casasDecimais: 1, preco: 10.5, ativo: true },
  { id: 'par-zn', codigo: 'ZN', nome: 'Zinco', grupoId: 'solo', unidade: 'mg/dm³', tipo: 'numerico', metodo: 'Mehlich-1 + absorção atômica', casasDecimais: 2, preco: 10.5, ativo: true },
  { id: 'par-na', codigo: 'NA', nome: 'Sódio trocável', grupoId: 'solo', unidade: 'cmolc/dm³', tipo: 'numerico', metodo: 'Mehlich-1 + fotometria de chama', casasDecimais: 2, preco: 9.5, ativo: true },
  { id: 'par-p-res', codigo: 'P-RES', nome: 'Fósforo (resina)', grupoId: 'solo', unidade: 'mg/dm³', tipo: 'numerico', metodo: 'IAC Boletim 100 — resina trocadora de íons', casasDecimais: 1, preco: 15.0, ativo: true },
  { id: 'par-p-rem', codigo: 'P-REM', nome: 'Fósforo remanescente', grupoId: 'solo', unidade: 'mg/L', tipo: 'numerico', metodo: 'Alvarez V. et al. (2000)', casasDecimais: 1, preco: 12.0, ativo: true },
  { id: 'par-sb', codigo: 'SB', nome: 'Soma de bases', grupoId: 'solo', unidade: 'cmolc/dm³', tipo: 'numerico', metodo: 'Calculado: Ca + Mg + K + Na', casasDecimais: 2, preco: 0, ativo: true },
  { id: 'par-m', codigo: 'M', nome: 'Saturação por alumínio', grupoId: 'solo', unidade: '%', tipo: 'numerico', metodo: 'Calculado: 100 · Al / (SB + Al)', casasDecimais: 1, preco: 0, ativo: true },

  { id: 'par-ca-fol', codigo: 'CA-FOL', nome: 'Cálcio foliar', grupoId: 'foliar', unidade: 'g/kg', tipo: 'numerico', metodo: 'Digestão nitroperclórica + absorção atômica', casasDecimais: 1, preco: 11.0, ativo: true },
  { id: 'par-mg-fol', codigo: 'MG-FOL', nome: 'Magnésio foliar', grupoId: 'foliar', unidade: 'g/kg', tipo: 'numerico', metodo: 'Digestão nitroperclórica + absorção atômica', casasDecimais: 2, preco: 11.0, ativo: true },
  { id: 'par-s-fol', codigo: 'S-FOL', nome: 'Enxofre foliar', grupoId: 'foliar', unidade: 'g/kg', tipo: 'numerico', metodo: 'Digestão nitroperclórica + turbidimetria', casasDecimais: 2, preco: 12.0, ativo: true },
  { id: 'par-b-fol', codigo: 'B-FOL', nome: 'Boro foliar', grupoId: 'foliar', unidade: 'mg/kg', tipo: 'numerico', metodo: 'Via seca + colorimetria (azometina-H)', casasDecimais: 1, preco: 13.0, ativo: true },
  { id: 'par-cu-fol', codigo: 'CU-FOL', nome: 'Cobre foliar', grupoId: 'foliar', unidade: 'mg/kg', tipo: 'numerico', metodo: 'Digestão nitroperclórica + absorção atômica', casasDecimais: 1, preco: 10.5, ativo: true },
  { id: 'par-fe-fol', codigo: 'FE-FOL', nome: 'Ferro foliar', grupoId: 'foliar', unidade: 'mg/kg', tipo: 'numerico', metodo: 'Digestão nitroperclórica + absorção atômica', casasDecimais: 0, preco: 10.5, ativo: true },
  { id: 'par-mn-fol', codigo: 'MN-FOL', nome: 'Manganês foliar', grupoId: 'foliar', unidade: 'mg/kg', tipo: 'numerico', metodo: 'Digestão nitroperclórica + absorção atômica', casasDecimais: 0, preco: 10.5, ativo: true },
  { id: 'par-zn-fol', codigo: 'ZN-FOL', nome: 'Zinco foliar', grupoId: 'foliar', unidade: 'mg/kg', tipo: 'numerico', metodo: 'Digestão nitroperclórica + absorção atômica', casasDecimais: 1, preco: 10.5, ativo: true },

  // --- Bromatologia: a análise de forragem que o pecuarista pede ---
  { id: 'par-ms', codigo: 'MS', nome: 'Matéria seca', grupoId: 'bromatologia', unidade: '%', tipo: 'numerico', metodo: 'AOAC 934.01 — estufa a 105 °C', casasDecimais: 2, preco: 16.0, ativo: true },
  { id: 'par-pb', codigo: 'PB', nome: 'Proteína bruta', grupoId: 'bromatologia', unidade: '%', tipo: 'numerico', metodo: 'AOAC 984.13 — Kjeldahl, N × 6,25', casasDecimais: 2, preco: 28.0, ativo: true },
  { id: 'par-fdn', codigo: 'FDN', nome: 'Fibra em detergente neutro', grupoId: 'bromatologia', unidade: '%', tipo: 'numerico', metodo: 'Van Soest (1991) — detergente neutro', casasDecimais: 2, preco: 34.0, ativo: true },
  { id: 'par-fda', codigo: 'FDA', nome: 'Fibra em detergente ácido', grupoId: 'bromatologia', unidade: '%', tipo: 'numerico', metodo: 'Van Soest (1991) — detergente ácido', casasDecimais: 2, preco: 32.0, ativo: true },
  { id: 'par-ee', codigo: 'EE', nome: 'Extrato etéreo', grupoId: 'bromatologia', unidade: '%', tipo: 'numerico', metodo: 'AOAC 920.39 — Soxhlet', casasDecimais: 2, preco: 26.0, ativo: true },
  { id: 'par-mm', codigo: 'MM', nome: 'Matéria mineral', grupoId: 'bromatologia', unidade: '%', tipo: 'numerico', metodo: 'AOAC 942.05 — incineração a 600 °C', casasDecimais: 2, preco: 18.0, ativo: true },
  { id: 'par-ndt', codigo: 'NDT', nome: 'Nutrientes digestíveis totais', grupoId: 'bromatologia', unidade: '%', tipo: 'numerico', metodo: 'Cálculo: 87,84 − (0,70 × FDA)', casasDecimais: 1, preco: 0, ativo: true },
  { id: 'par-ph-silagem', codigo: 'PH-SIL', nome: 'pH da silagem', grupoId: 'bromatologia', unidade: '', tipo: 'numerico', metodo: 'Potenciometria em extrato aquoso 1:10', casasDecimais: 2, incerteza: 0.06, preco: 14.0, ativo: true, ehPh: true, extrator: 'H2O', proporcao: '1:10' },

  // --- Gesso agrícola (IN SDA 05/2007) ---
  { id: 'par-ca-gesso', codigo: 'CA-GES', nome: 'Cálcio', grupoId: 'gesso', unidade: '%', tipo: 'numerico', metodo: 'IN SDA 05/2007 — complexometria com EDTA', casasDecimais: 2, preco: 24.0, ativo: true },
  { id: 'par-s-gesso', codigo: 'S-GES', nome: 'Enxofre', grupoId: 'gesso', unidade: '%', tipo: 'numerico', metodo: 'IN SDA 05/2007 — gravimetria do sulfato de bário', casasDecimais: 2, preco: 26.0, ativo: true },
  { id: 'par-umid-gesso', codigo: 'UMID-GES', nome: 'Umidade', grupoId: 'gesso', unidade: '%', tipo: 'numerico', metodo: 'IN SDA 05/2007 — estufa a 65 °C', casasDecimais: 2, preco: 14.0, ativo: true },
  { id: 'par-gran-gesso', codigo: 'GRAN-GES', nome: 'Granulometria — passante ABNT 50', grupoId: 'gesso', unidade: '%', tipo: 'numerico', metodo: 'IN SDA 05/2007 — peneiramento', casasDecimais: 1, preco: 18.0, ativo: true },
  { id: 'par-ph-gesso', codigo: 'PH-GES', nome: 'pH da suspensão', grupoId: 'gesso', unidade: '', tipo: 'numerico', metodo: 'Potenciometria, suspensão 1:5', casasDecimais: 2, incerteza: 0.06, preco: 13.0, ativo: true, ehPh: true, extrator: 'H2O', proporcao: '1:5' },

  // --- Produtos biológicos: inoculantes e defensivos microbiológicos ---
  { id: 'par-ufc', codigo: 'UFC', nome: 'Contagem de células viáveis', grupoId: 'produtos-biologicos', unidade: 'UFC/mL', tipo: 'numerico', metodo: 'IN SDA 13/2011 — plaqueamento em meio seletivo', casasDecimais: 0, preco: 88.0, ativo: true },
  { id: 'par-pureza-bio', codigo: 'PUR-BIO', nome: 'Pureza microbiológica', grupoId: 'produtos-biologicos', unidade: '%', tipo: 'numerico', metodo: 'IN SDA 13/2011 — ausência de contaminantes', casasDecimais: 1, preco: 62.0, ativo: true },
  { id: 'par-contam-bio', codigo: 'CONT-BIO', nome: 'Contaminantes totais', grupoId: 'produtos-biologicos', unidade: 'UFC/mL', tipo: 'numerico', metodo: 'IN SDA 13/2011 — plaqueamento em meio geral', casasDecimais: 0, preco: 58.0, ativo: true },
  { id: 'par-ph-bio', codigo: 'PH-BIO', nome: 'pH do produto', grupoId: 'produtos-biologicos', unidade: '', tipo: 'numerico', metodo: 'Potenciometria direta no produto formulado', casasDecimais: 2, incerteza: 0.05, preco: 12.0, ativo: true, ehPh: true, extrator: 'direto', proporcao: 'direto' },

  // --- Cromatografia: resíduos de agrotóxicos ---
  { id: 'par-res-glifo', codigo: 'RES-GLIFO', nome: 'Glifosato e AMPA', grupoId: 'cromatografia', unidade: 'mg/kg', tipo: 'numerico', metodo: 'LC-MS/MS — QuEChERS modificado', casasDecimais: 3, preco: 320.0, ativo: true },
  { id: 'par-res-multi', codigo: 'RES-MULTI', nome: 'Multirresíduo (mais de 180 analitos)', grupoId: 'cromatografia', unidade: 'mg/kg', tipo: 'numerico', metodo: 'GC-MS/MS e LC-MS/MS — QuEChERS', casasDecimais: 3, preco: 480.0, ativo: true },
  { id: 'par-res-piretr', codigo: 'RES-PIRETR', nome: 'Piretroides', grupoId: 'cromatografia', unidade: 'mg/kg', tipo: 'numerico', metodo: 'GC-MS/MS — extração com acetonitrila', casasDecimais: 3, preco: 260.0, ativo: true },

  // --- Patologia: sanidade de sementes e tecidos ---
  { id: 'par-incid-fungo', codigo: 'INC-FUN', nome: 'Incidência de fungos', grupoId: 'patologia', unidade: '%', tipo: 'numerico', metodo: 'Blotter test — RAS/MAPA 2009', casasDecimais: 1, preco: 72.0, ativo: true },
  { id: 'par-incid-bact', codigo: 'INC-BAC', nome: 'Incidência de bactérias', grupoId: 'patologia', unidade: '%', tipo: 'numerico', metodo: 'Isolamento em meio semisseletivo', casasDecimais: 1, preco: 78.0, ativo: true },
  { id: 'par-sanidade', codigo: 'SAN', nome: 'Sementes sadias', grupoId: 'patologia', unidade: '%', tipo: 'numerico', metodo: 'RAS/MAPA 2009 — análise sanitária', casasDecimais: 1, preco: 64.0, ativo: true },

  // --- Terceirizadas: o laboratório parceiro devolve o número, este
  //     laboratório responde pelo laudo e registra a subcontratação ---
  { id: 'par-sub-metais', codigo: 'SUB-METAIS', nome: 'Metais pesados (subcontratado)', grupoId: 'terceirizadas', unidade: 'mg/kg', tipo: 'numerico', metodo: 'ICP-MS em laboratório subcontratado acreditado', casasDecimais: 3, preco: 420.0, ativo: true },
  { id: 'par-sub-dioxina', codigo: 'SUB-DIOX', nome: 'Dioxinas e furanos (subcontratado)', grupoId: 'terceirizadas', unidade: 'ng/kg', tipo: 'numerico', metodo: 'HRGC/HRMS em laboratório subcontratado', casasDecimais: 2, preco: 1850.0, ativo: true },
];

export const parametrosPh = parametros.filter((p) => p.ehPh);

/** Id do parâmetro pelo código — usado por legendas, modelos e pacotes. */
const idDe = (codigo: string) => parametros.find((p) => p.codigo === codigo)?.id ?? '';

/* ---------------- Critérios de aceitação ---------------- */

export const criterios: CriterioAceitacao[] = [
  {
    id: 'crt-geral', nome: 'Geral — qualquer ensaio',
    rsdMaxPercentual: 5, diferencaMaxPercentual: 10, zScoreMax: 3, ativo: true,
  },
  {
    id: 'crt-potenciometria', nome: 'Potenciometria (pH e índice SMP)',
    somentePh: true, rsdMaxPercentual: 2, zScoreMax: 3,
    slopeMin: 95, slopeMax: 105, slopeAlerta: 97, offsetMaxMv: 30, r2Min: 0.999,
    derivaMaxMvPorMin: 0.6, janelaEstabilidadeS: 10, ativo: true,
  },
  {
    id: 'crt-solo', nome: 'Solo — fertilidade',
    grupoId: 'solo', rsdMaxPercentual: 4, diferencaMaxPercentual: 8, zScoreMax: 3, ativo: true,
  },
  {
    id: 'crt-agua', nome: 'Água e efluentes',
    grupoId: 'agua-efluentes', rsdMaxPercentual: 6, diferencaMaxPercentual: 12, zScoreMax: 3, ativo: true,
  },
];

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
    parametroIds: por('solo', 'PH-H2O', 'PH-SMP', 'MO', 'P-MEL', 'K', 'CA', 'MG',
      'H+AL', 'AL', 'SB', 'CTC', 'V', 'M', 'S', 'B', 'CU', 'FE', 'MN', 'ZN'),
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
    id: 'tpa-bro-nitro', codigo: 'BR GP FORRAGEM', nome: 'Análise de forragem completa',
    grupoId: 'bromatologia', prazoDias: 10, ativo: true,
    parametroIds: por('bromatologia', 'MS', 'PB', 'FDN', 'FDA', 'EE', 'MM', 'NDT'),
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
  {
    id: 'tpa-bro-silagem', codigo: 'BR GP SILAGEM', nome: 'Qualidade de silagem',
    grupoId: 'bromatologia', prazoDias: 8, ativo: true,
    parametroIds: por('bromatologia', 'MS', 'PB', 'PH-SIL'),
  },
  {
    id: 'tpa-cro-multi', codigo: 'CRO GP MULTIRRESÍDUO', nome: 'Multirresíduo de agrotóxicos',
    grupoId: 'cromatografia', prazoDias: 15, ativo: true,
    parametroIds: por('cromatografia', 'RES-MULTI', 'RES-GLIFO'),
  },
  {
    id: 'tpa-pat-sanidade', codigo: 'PAT GP SANIDADE', nome: 'Análise sanitária de sementes',
    grupoId: 'patologia', prazoDias: 12, ativo: true,
    parametroIds: por('patologia', 'INC-FUN', 'INC-BAC', 'SAN'),
  },
  {
    id: 'tpa-ter-metais', codigo: 'TER GP METAIS', nome: 'Metais pesados (subcontratado)',
    grupoId: 'terceirizadas', prazoDias: 25, ativo: true,
    parametroIds: por('terceirizadas', 'SUB-METAIS'),
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
  // Só responsável técnico tem registro no conselho, e é o dele que sai
  // no laudo que ele assina — não o da unidade.
  crq: papelId === 'papel-rt' ? `CRQ ${inteiro(2, 15)}ª Região nº ${inteiro(10_000, 99_999)}` : undefined,
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

/* ---------------- Tipos de equipamento ---------------- */

/**
 * O rito de verificação de cada família. É cadastro porque o
 * laboratório compra aparelho novo sem avisar o programador — e o
 * aparelho novo precisa entrar com o mesmo controle dos outros.
 */
export const tiposEquipamento: TipoEquipamento[] = [
  {
    id: 'phmetro', codigo: 'PHM', nome: 'Potenciômetro (pHmetro)', grandeza: 'pH e mV',
    exigeCurva: false, verificacao: 'calibracao-multiponto', periodicidadeDias: 1,
    bloqueiaVencido: true, protocolos: ['mettler', 'digimed', 'hanna', 'tecnal', 'generico-ascii'],
    ativo: true,
  },
  {
    id: 'espectrofotometro', codigo: 'ESP', nome: 'Espectrofotômetro UV-Vis', grandeza: 'absorbância',
    exigeCurva: true, verificacao: 'curva-analitica', periodicidadeDias: 30,
    bloqueiaVencido: true, protocolos: ['generico-ascii', 'thermo'], ativo: true,
  },
  {
    id: 'absorcao-atomica', codigo: 'AA', nome: 'Absorção atômica', grandeza: 'absorbância',
    exigeCurva: true, verificacao: 'curva-analitica', periodicidadeDias: 30,
    bloqueiaVencido: true, protocolos: ['generico-ascii', 'agilent', 'perkinelmer'], ativo: true,
  },
  {
    id: 'icp-oes', codigo: 'ICP', nome: 'ICP-OES / MP-AES', grandeza: 'intensidade',
    exigeCurva: true, verificacao: 'curva-analitica', periodicidadeDias: 30,
    bloqueiaVencido: true, protocolos: ['generico-ascii', 'agilent'], ativo: true,
  },
  {
    id: 'fotometro-chama', codigo: 'FTC', nome: 'Fotômetro de chama', grandeza: 'intensidade',
    exigeCurva: true, verificacao: 'curva-analitica', periodicidadeDias: 7,
    bloqueiaVencido: true, protocolos: ['generico-ascii', 'digimed'], ativo: true,
  },
  {
    id: 'balanca', codigo: 'BAL', nome: 'Balança analítica', grandeza: 'massa (g)',
    exigeCurva: false, verificacao: 'massa-padrao', periodicidadeDias: 1,
    bloqueiaVencido: true, protocolos: ['mettler', 'shimadzu', 'generico-ascii'], ativo: true,
  },
  {
    id: 'destilador-n', codigo: 'DEN', nome: 'Destilador de nitrogênio', grandeza: 'volume titulado (mL)',
    exigeCurva: false, verificacao: 'padrao-de-verificacao', periodicidadeDias: 30,
    bloqueiaVencido: true, protocolos: [], ativo: true,
  },
  {
    id: 'analisador-elementar', codigo: 'ANE', nome: 'Analisador elementar CHNS', grandeza: '% em massa',
    exigeCurva: true, verificacao: 'padrao-de-verificacao', periodicidadeDias: 15,
    bloqueiaVencido: true, protocolos: ['generico-ascii'], ativo: true,
  },
  {
    id: 'estufa', codigo: 'EST', nome: 'Estufa de secagem', grandeza: 'temperatura (°C)',
    exigeCurva: false, verificacao: 'temperatura', periodicidadeDias: 90,
    // Estufa vencida atrasa um ensaio; não produz número errado sozinha.
    bloqueiaVencido: false, protocolos: [], ativo: true,
  },
  {
    id: 'agitador', codigo: 'AGI', nome: 'Agitador / mesa orbital', grandeza: '—',
    exigeCurva: false, verificacao: 'nenhuma', periodicidadeDias: 0,
    bloqueiaVencido: false, protocolos: [], ativo: true,
  },
];

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
  { id: 'eq-aa-01', tag: 'AA-01', nome: 'Espectrômetro de absorção atômica', fabricante: 'Agilent', modelo: '240FS AA', numeroSerie: 'AG2401190', tipo: 'absorcao-atomica', unidadeId: 'un-13', setor: 'Instrumental', protocolo: 'agilent', baudRate: 19200, ativo: true, dataAquisicao: diasAtras(1240), proximaManutencao: diasAFrente(38) },
  { id: 'eq-icp-01', tag: 'ICP-01', nome: 'MP-AES', fabricante: 'Agilent', modelo: '4210 MP-AES', numeroSerie: 'AG4210077', tipo: 'icp-oes', unidadeId: 'un-13', setor: 'Instrumental', protocolo: 'agilent', baudRate: 19200, ativo: true, dataAquisicao: diasAtras(420), proximaManutencao: diasAFrente(112) },
  { id: 'eq-ftc-01', tag: 'FTC-01', nome: 'Fotômetro de chama', fabricante: 'Digimed', modelo: 'DM-62', numeroSerie: 'DG6218803', tipo: 'fotometro-chama', unidadeId: 'un-13', setor: 'Instrumental', protocolo: 'digimed', baudRate: 9600, ativo: true, dataAquisicao: diasAtras(1510), proximaManutencao: diasAFrente(26) },
  { id: 'eq-den-01', tag: 'DEN-01', nome: 'Destilador de nitrogênio Kjeldahl', fabricante: 'Tecnal', modelo: 'TE-0363', numeroSerie: 'TC0363441', tipo: 'destilador-n', unidadeId: 'un-13', setor: 'Úmidos', ativo: true, dataAquisicao: diasAtras(2100), proximaManutencao: diasAFrente(54) },
  { id: 'eq-ane-01', tag: 'ANE-01', nome: 'Analisador elementar CHNS', fabricante: 'Elementar', modelo: 'vario MACRO cube', numeroSerie: 'EL8802213', tipo: 'analisador-elementar', unidadeId: 'un-13', setor: 'Instrumental', protocolo: 'generico-ascii', baudRate: 9600, ativo: true, dataAquisicao: diasAtras(300), proximaManutencao: diasAFrente(144) },
  { id: 'eq-bal-02', tag: 'BAL-02', nome: 'Balança semianalítica', fabricante: 'Mettler Toledo', modelo: 'ME4002', numeroSerie: 'MT4002618', tipo: 'balanca', unidadeId: 'un-13', setor: 'Preparo', protocolo: 'mettler', baudRate: 9600, ativo: true, dataAquisicao: diasAtras(640), proximaManutencao: diasAFrente(80) },
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
  const diasVencido = diasDesdeRecepcao - prazoDias;

  // Nenhum laboratório deixa amostra aberta por meses: depois de três
  // semanas de atraso ela saiu ou foi cancelada.
  if (diasVencido > 21) return r < 0.97 ? 'liberada' : 'cancelada';

  if (r < 0.965) return 'liberada';
  if (r < 0.983) return 'aguardando-revisao';
  if (r < 0.991) return 'em-analise';
  return 'cancelada';
}

/**
 * O que cada tipo de cliente manda para o laboratório. Sortear grupo solto
 * produzia etiqueta de fertilizante para empresa de saneamento, e quem
 * conhece o ramo vê na hora.
 */
const GRUPOS_POR_SEGMENTO: Record<string, GrupoAnaliseId[]> = {
  Usina: ['solo', 'solo', 'foliar', 'derivados-cana', 'derivados-cana', 'corretivos-agricolas', 'seiva'],
  'Produtor rural': ['solo', 'solo', 'solo', 'foliar', 'nematoides', 'corretivos-agricolas', 'seiva'],
  Cooperativa: ['solo', 'solo', 'foliar', 'sementes', 'fertilizantes', 'corretivos-agricolas'],
  'Revenda de insumos': ['fertilizantes', 'corretivos-agricolas', 'gesso', 'produtos-biologicos'],
  Sementeira: ['sementes', 'sementes', 'solo', 'foliar'],
  'Indústria de fertilizantes': ['fertilizantes', 'fertilizantes', 'corretivos-agricolas', 'gesso'],
  Mineradora: ['corretivos-agricolas', 'corretivos-agricolas', 'gesso', 'solo'],
  'Consultoria agronômica': ['solo', 'solo', 'foliar', 'nematoides', 'seiva'],
  Saneamento: ['agua-efluentes', 'agua-efluentes', 'compostos-organicos'],
  'Indústria de biológicos': ['produtos-biologicos', 'compostos-organicos'],
  Algodoeira: ['solo', 'foliar', 'sementes'],
  Indústria: ['agua-efluentes', 'bromatologia', 'compostos-organicos'],
  Pecuarista: ['bromatologia', 'solo', 'foliar', 'agua-efluentes'],
};

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

/**
 * Perfil químico de uma amostra, com os valores conversando entre si: o
 * SMP responde ao pH, o H+Al sai do SMP pela equação do CFSEMG, a CTC é
 * soma de bases mais acidez potencial e o V% é a razão entre as duas.
 * Sortear cada elemento isolado dava laudo que nenhum agrônomo assina —
 * H+Al de 21 cmolc/dm³, alumínio de 10, SMP igual ao pH em CaCl₂.
 */
function perfilQuimico(grupoId: GrupoAnaliseId): Record<string, number> {
  if (grupoId === 'solo') {
    const phH2O = entre(4.2, 6.9);
    const smp = Math.min(7.4, Math.max(4.4, 3.1 + 0.58 * phH2O + entre(-0.1, 0.1)));
    const hAl = Math.min(9, Math.max(0.5, hMaisAlPorSmp(smp)));
    // 0 = solo ácido e pobre, 1 = solo corrigido
    const fertilidade = (phH2O - 4.2) / 2.7;
    const ca = entre(0.4, 1.4) + fertilidade * entre(1.2, 3.4);
    const mg = ca * entre(0.22, 0.45);
    const k = entre(28, 190);                 // mg/dm³
    const na = entre(0.01, 0.12);
    const sb = ca + mg + k / 391 + na;        // 391 = massa equivalente do K
    const ctc = sb + hAl;
    const al = phH2O > 5.6 ? entre(0, 0.12) : entre(0.15, 1.6) * (1 - fertilidade);

    return {
      'PH-H2O': phH2O,
      'PH-CACL2': phH2O - entre(0.4, 0.7),
      'PH-KCL': phH2O - entre(0.5, 0.9),
      'PH-SMP': smp,
      'H+AL': hAl, AL: al, CA: ca, MG: mg, K: k, NA: na,
      SB: sb, CTC: ctc, V: (sb / ctc) * 100, M: (al / (sb + al)) * 100,
      MO: entre(8, 42), 'P-MEL': entre(2, 48), 'P-RES': entre(4, 62), 'P-REM': entre(8, 52),
      S: entre(3, 38), B: entre(0.1, 0.9), CU: entre(0.4, 4.5),
      FE: entre(14, 160), MN: entre(2, 62), ZN: entre(0.3, 6.5),
      ARG: entre(120, 620),
    };
  }

  if (grupoId === 'foliar') {
    return {
      'N-FOL': entre(25, 46), 'P-FOL': entre(1.4, 3.4), 'K-FOL': entre(14, 28),
      'CA-FOL': entre(4, 18), 'MG-FOL': entre(1.6, 5.2), 'S-FOL': entre(1.4, 3.6),
      'B-FOL': entre(18, 62), 'CU-FOL': entre(4, 18), 'FE-FOL': entre(60, 320),
      'MN-FOL': entre(25, 180), 'ZN-FOL': entre(14, 58),
    };
  }

  if (grupoId === 'agua-efluentes') {
    return { CE: entre(60, 1800), DBO: entre(2, 320), DQO: entre(8, 780), TURB: entre(0.4, 90) };
  }
  if (grupoId === 'corretivos-agricolas') return { PRNT: entre(62, 94), PN: entre(78, 112) };
  if (grupoId === 'derivados-cana') return { BRIX: entre(14, 23) };
  if (grupoId === 'fertilizantes') return { 'N-TOT': entre(8, 46) };
  if (grupoId === 'sementes') return { GERM: entre(72, 99) };
  if (grupoId === 'nematoides') return { NEMA: entre(0, 1800) };

  if (grupoId === 'bromatologia') {
    // Fibra e proteína andam em sentidos opostos: capim maduro tem muita
    // FDN e pouca PB. Um só eixo de maturidade mantém o laudo coerente.
    const maturidade = entre(0, 1);
    const fda = 24 + maturidade * 18;
    return {
      MS: entre(22, 92), PB: 20 - maturidade * 13, FDN: 46 + maturidade * 26,
      FDA: fda, EE: entre(1.2, 4.6), MM: entre(5.2, 12.4),
      NDT: 87.84 - 0.7 * fda,
      // Silagem bem fermentada fica entre 3,6 e 4,2.
      'PH-SIL': entre(3.6, 4.6),
    };
  }

  if (grupoId === 'gesso') {
    // Gesso agrícola comercial gira em torno de CaSO₄·2H₂O: ~17 % Ca e ~13 % S.
    return {
      'CA-GES': entre(16.2, 20.4), 'S-GES': entre(13.0, 17.2),
      'UMID-GES': entre(4.8, 14.6), 'GRAN-GES': entre(68, 98),
      'PH-GES': entre(5.8, 7.4),
    };
  }

  if (grupoId === 'produtos-biologicos') {
    return {
      UFC: entre(1e8, 9e9), 'PUR-BIO': entre(96.4, 100),
      'CONT-BIO': entre(0, 4e5), 'PH-BIO': entre(5.4, 7.2),
    };
  }

  if (grupoId === 'cromatografia') {
    // A maioria das amostras dá abaixo do limite de quantificação.
    const traco = () => (chance(0.72) ? entre(0, 0.01) : entre(0.01, 0.42));
    return { 'RES-GLIFO': traco(), 'RES-MULTI': traco(), 'RES-PIRETR': traco() };
  }

  if (grupoId === 'patologia') {
    const fungos = entre(0, 26);
    const bacterias = entre(0, 9);
    return {
      'INC-FUN': fungos, 'INC-BAC': bacterias,
      SAN: Math.max(0, 100 - fungos - bacterias),
    };
  }

  if (grupoId === 'terceirizadas') {
    return { 'SUB-METAIS': entre(0.002, 1.8), 'SUB-DIOX': entre(0.04, 2.6) };
  }

  return {};
}

/** Último recurso: faixa pela unidade, para parâmetro sem perfil próprio. */
function faixaPorUnidade(unidade: string): number {
  switch (unidade) {
    case 'cmolc/dm³': return entre(0.2, 6);
    case 'mg/dm³': case 'mg/kg': return entre(1, 80);
    case 'g/dm³': case 'g/kg': return entre(2, 40);
    case 'mg/L': return entre(0.5, 60);
    case '%': return entre(1, 60);
    default: return entre(0.4, 24);
  }
}

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

for (let l = 0; l < 210; l++) {
  const cliente = escolher(clientes.filter((c) => c.ativo));
  const diasAtrasRecepcao = inteiro(0, 115);
  const qtd = inteiro(3, 17);

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

  const grupoLote = escolher(GRUPOS_POR_SEGMENTO[cliente.segmento] ?? GRUPOS_FREQUENTES);
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
      // Amostra recente ainda tem prazo pela frente; antiga já venceu.
      prazoEntrega: deslocar(diasAtrasRecepcao - grupo.prazoPadraoDias).toISOString(),
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

    // Um perfil por amostra: todos os elementos dela saem do mesmo solo.
    const perfil = perfilQuimico(grupoLote);
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
          const phVerdadeiro = perfil[par.codigo] ?? phTipico(grupoLote, par.extrator ?? 'H2O');
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
          const base = perfil[par.codigo] ?? faixaPorUnidade(par.unidade);
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

/* ---------------- Modelos de importação ---------------- */

/**
 * O acerto de colunas de cada aparelho, salvo uma vez. Guardado pelo
 * título normalizado: o aparelho reordena colunas entre versões de
 * firmware, e um modelo preso ao índice passaria a ler o número
 * errado sem avisar ninguém.
 */
export const modelosImportacao: ModeloImportacao[] = [
  {
    id: 'mdi-esp-p', nome: 'Genesys 150 — fósforo e potássio',
    equipamentoId: 'eq-esp-01', fluxo: 'resultados',
    separador: ';', linhasIgnoradas: 0, temCabecalho: true, decimalVirgula: true,
    porTitulo: {
      sampleid: 'chave',
      abs882nm: idDe('P-MEL'),
      abs766nm: idDe('K'),
    },
    ativo: true, criadoPorId: usuarios[2].id, data: diasAtras(120),
  },
  {
    id: 'mdi-aa-bases', nome: 'Agilent 240FS — cálcio e magnésio',
    equipamentoId: 'eq-aa-01', fluxo: 'resultados',
    separador: ',', linhasIgnoradas: 2, temCabecalho: true, decimalVirgula: false,
    porTitulo: {
      sample: 'chave',
      ca422: idDe('CA'),
      mg285: idDe('MG'),
    },
    ativo: true, criadoPorId: usuarios[3].id, data: diasAtras(86),
  },
  {
    id: 'mdi-ftc-k', nome: 'Digimed DM-62 — potássio e sódio',
    equipamentoId: 'eq-ftc-01', fluxo: 'resultados',
    separador: ';', linhasIgnoradas: 0, temCabecalho: true, decimalVirgula: true,
    porTitulo: {
      amostra: 'chave',
      k: idDe('K'),
      na: idDe('NA'),
    },
    ativo: true, criadoPorId: usuarios[4].id, data: diasAtras(54),
  },
  {
    id: 'mdi-planilha-campo', nome: 'Planilha de campo do cliente',
    fluxo: 'amostras',
    separador: ';', linhasIgnoradas: 0, temCabecalho: true, decimalVirgula: true,
    porTitulo: {
      identificacao: 'identificacao',
      propriedade: 'propriedade',
      talhao: 'talhao',
      profundidade: 'profundidade',
      cultura: 'cultura',
      datadecoleta: 'dataColeta',
    },
    ativo: true, criadoPorId: usuarios[6].id, data: diasAtras(210),
  },
];

/* ---------------- Verificação metrológica ---------------- */

/**
 * O histórico que dá ao espectro, à balança e ao destilador o mesmo
 * controle que o potenciômetro já tinha. A tolerância é por forma de
 * verificação, porque pesar massa padrão e rodar curva não se julgam
 * pelo mesmo critério.
 */
const TOLERANCIA: Record<string, number> = {
  'curva-analitica': 5,
  'massa-padrao': 0.1,
  'padrao-de-verificacao': 4,
  temperatura: 2,
};

export const verificacoesEquipamento: VerificacaoEquipamento[] = [];
{
  const porTipo = new Map(tiposEquipamento.map((t) => [t.id, t]));

  for (const eq of equipamentos) {
    const tipo = porTipo.get(eq.tipo);
    // O potenciômetro tem a sua própria trilha em `calibracoes`.
    if (!tipo || tipo.verificacao === 'nenhuma' || tipo.verificacao === 'calibracao-multiponto') continue;

    const tolerancia = TOLERANCIA[tipo.verificacao] ?? 5;
    const nominal = tipo.verificacao === 'massa-padrao' ? 100
      : tipo.verificacao === 'temperatura' ? 105
      : 10;

    /* Seis verificações para trás, uma por período. A mais recente é a
       que decide, e ela fica dentro da validade — menos no destilador,
       deixado vencido de propósito para a tela ter o que mostrar. */
    /* Atrasar só o registro mais novo não o deixaria vencido: ele
       passaria a ser o penúltimo, e o anterior viraria o vigente.
       O histórico inteiro recua. */
    const atraso = eq.id === 'eq-den-01' ? tipo.periodicidadeDias + 6 : 0;
    for (let i = 5; i >= 0; i -= 1) {
      const atrasoDias = i * tipo.periodicidadeDias + atraso;
      // `deslocar(n)` recua n dias: verificação é evento passado.
      const quando = deslocar(atrasoDias, inteiro(8, 16));
      const erro = (rnd() - 0.5) * tolerancia * 1.4;
      const medido = nominal * (1 + erro / 100);

      verificacoesEquipamento.push({
        id: `vrf-${eq.id}-${i}`,
        equipamentoId: eq.id,
        forma: tipo.verificacao,
        data: quando.toISOString(),
        analistaId: escolher(analistas).id,
        valorNominal: nominal,
        valorMedido: Number(medido.toFixed(4)),
        erroPercentual: Number(erro.toFixed(3)),
        r2: tipo.verificacao === 'curva-analitica' ? Number((0.9985 + rnd() * 0.0014).toFixed(5)) : undefined,
        resultado: avaliarVerificacao(erro, tolerancia),
        validaAte: new Date(+quando + tipo.periodicidadeDias * 86_400_000).toISOString(),
        observacao: tipo.verificacao === 'massa-padrao' ? 'Massa padrão classe E2 rastreada ao INMETRO.' : undefined,
      });
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
/**
 * A despesa é proporcional à receita, não um valor absoluto: se o volume
 * de amostras mudar, o laboratório continua coerente em vez de aparecer
 * com um prejuízo de centenas de milhares por mês.
 * Os pesos são fração do faturamento médio mensal.
 */
const DESPESAS: Array<[string, string, number, number]> = [
  ['Folha de pagamento', 'Pessoal', 0.30, 0.36],
  ['Reagentes e padrões analíticos', 'Insumos de laboratório', 0.08, 0.13],
  ['Aluguel do galpão', 'Ocupação', 0.06, 0.06],
  ['Energia elétrica — CELPE', 'Utilidades', 0.04, 0.07],
  ['Ensaios subcontratados', 'Terceiros', 0.03, 0.08],
  ['Frete e logística de amostras', 'Logística', 0.02, 0.05],
  ['Descarte de resíduos químicos', 'Ambiental', 0.02, 0.04],
  ['Manutenção de equipamentos', 'Manutenção', 0.01, 0.05],
  ['Software e licenças', 'TI', 0.01, 0.02],
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

/** Faturamento médio mensal já gerado, base de rateio da despesa. */
const MESES_DE_OPERACAO = 5;
const faturamentoMedioMensal =
  titulos.filter((t) => t.tipo === 'receber').reduce((s, t) => s + t.valor, 0) / MESES_DE_OPERACAO;

for (let m = 0; m < MESES_DE_OPERACAO; m++) {
  for (const [descricao, categoria, pesoMin, pesoMax] of DESPESAS) {
    const venc = new Date(HOJE);
    venc.setMonth(venc.getMonth() - m, inteiro(5, 25));
    const vencido = venc < HOJE;
    const valor = faturamentoMedioMensal * entre(pesoMin, pesoMax);
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

/* ============================================================
   CADASTROS DE APOIO
   ============================================================ */



function montarCurva(
  id: string, codigo: string, nome: string, codigoParam: string,
  equipamentoId: string | undefined, pontos: PontoCurva[],
  diluicao: number, diasAtrasCriacao: number, tipo: TipoAjuste = 'linear',
): Curva {
  const a = ajustarCurva(pontos, tipo);
  const validade = new Date(diasAtras(diasAtrasCriacao));
  validade.setDate(validade.getDate() + 30);
  return {
    id, codigo, nome,
    parametroId: idDe(codigoParam),
    equipamentoId,
    tipoAjuste: tipo,
    pontos,
    coefAngular: a.coefAngular,
    coefLinear: a.coefLinear,
    r2: a.r2,
    lod: a.lod,
    loq: a.loq,
    diluicao,
    analistaId: analistas[0]?.id,
    data: diasAtras(diasAtrasCriacao, 8),
    validaAte: validade.toISOString(),
    ativa: validade > HOJE,
    observacao: a.avisos[0],
  };
}

export const curvas: Curva[] = [
  montarCurva(
    'cur-p-mel', 'CUR-P-001', 'Fósforo Mehlich-1 — colorimetria 660 nm', 'P-MEL',
    'eq-esp-01',
    [
      { concentracao: 0, leitura: 0.004 },
      { concentracao: 2, leitura: 0.131 },
      { concentracao: 5, leitura: 0.318 },
      { concentracao: 10, leitura: 0.629 },
      { concentracao: 20, leitura: 1.248 },
      { concentracao: 40, leitura: 2.491 },
    ],
    10, 4,
  ),
  montarCurva(
    'cur-k-chama', 'CUR-K-001', 'Potássio — fotometria de chama 766,5 nm', 'K',
    undefined,
    [
      { concentracao: 0, leitura: 0.0 },
      { concentracao: 10, leitura: 48.2 },
      { concentracao: 20, leitura: 97.1 },
      { concentracao: 40, leitura: 193.6 },
      { concentracao: 80, leitura: 388.4 },
    ],
    5, 6, 'linear-sem-intercepto',
  ),
  montarCurva(
    'cur-ca-eaa', 'CUR-CA-001', 'Cálcio — absorção atômica 422,7 nm', 'CA',
    undefined,
    [
      { concentracao: 0, leitura: 0.002 },
      { concentracao: 1, leitura: 0.094 },
      { concentracao: 2, leitura: 0.187 },
      { concentracao: 4, leitura: 0.371 },
      { concentracao: 6, leitura: 0.548 },
      // padrão preparado errado: fica no registro, fora do ajuste
      { concentracao: 8, leitura: 0.512, descartado: true },
    ],
    // o fator de conversão do extrato para a base de solo já entra aqui,
    // junto com a diluição física da alíquota
    2, 2,
  ),
  montarCurva(
    'cur-n-foliar', 'CUR-N-001', 'Nitrogênio foliar — Kjeldahl, titulação', 'N-FOL',
    undefined,
    [
      { concentracao: 0, leitura: 0.01 },
      { concentracao: 5, leitura: 1.02 },
      { concentracao: 10, leitura: 1.98 },
      { concentracao: 20, leitura: 4.03 },
      { concentracao: 30, leitura: 6.01 },
    ],
    1, 34,
  ),
  montarCurva(
    'cur-turb', 'CUR-TURB-001', 'Turbidez — nefelometria, padrão formazina', 'TURB',
    undefined,
    [
      { concentracao: 0, leitura: 0.012 },
      { concentracao: 10, leitura: 0.241 },
      { concentracao: 50, leitura: 1.198 },
      { concentracao: 100, leitura: 2.402 },
    ],
    1, 11,
  ),
];

/* ---------------- Legendas (faixas de interpretação) ---------------- */

export const legendas: Legenda[] = [
  {
    id: 'leg-ph-h2o', codigo: 'LEG-PH-H2O', nome: 'Acidez ativa — pH em água',
    parametroId: idDe('PH-H2O'), fonte: 'CFSEMG, 5ª aproximação', padrao: true, ativa: true,
    faixas: [
      { ate: 4.5, rotulo: 'Muito baixo', descricao: 'Acidez muito elevada — provável toxidez por alumínio', severidade: 'critico' },
      { de: 4.5, ate: 5.5, rotulo: 'Baixo', descricao: 'Acidez elevada — calagem recomendada', severidade: 'critico' },
      { de: 5.5, ate: 6.1, rotulo: 'Bom', descricao: 'Faixa adequada — máxima disponibilidade de nutrientes', severidade: 'ideal' },
      { de: 6.1, ate: 7.1, rotulo: 'Alto', descricao: 'Acidez baixa — monitorar micronutrientes', severidade: 'bom' },
      { de: 7.1, rotulo: 'Muito alto', descricao: 'Alcalino — risco de deficiência de Fe, Mn, Zn e B', severidade: 'atencao' },
    ],
  },
  {
    id: 'leg-ph-cacl2', codigo: 'LEG-PH-CACL2', nome: 'Acidez ativa — pH em CaCl₂',
    parametroId: idDe('PH-CACL2'), fonte: 'IAC, Boletim Técnico 100', padrao: true, ativa: true,
    faixas: [
      { ate: 4.4, rotulo: 'Acidez muito alta', severidade: 'critico' },
      { de: 4.4, ate: 5.1, rotulo: 'Acidez alta', severidade: 'critico' },
      { de: 5.1, ate: 5.6, rotulo: 'Acidez média', severidade: 'atencao' },
      { de: 5.6, ate: 6.1, rotulo: 'Acidez baixa', descricao: 'Faixa adequada à maioria das culturas', severidade: 'ideal' },
      { de: 6.1, ate: 7.1, rotulo: 'Acidez muito baixa', severidade: 'bom' },
      { de: 7.1, rotulo: 'Alcalino', severidade: 'atencao' },
    ],
  },
  {
    id: 'leg-p', codigo: 'LEG-P', nome: 'Fósforo disponível',
    parametroId: idDe('P-MEL'), fonte: 'CFSEMG — textura média', padrao: true, ativa: true,
    faixas: [
      { ate: 6, rotulo: 'Muito baixo', severidade: 'critico' },
      { de: 6, ate: 16, rotulo: 'Baixo', severidade: 'atencao' },
      { de: 16, ate: 41, rotulo: 'Médio', severidade: 'bom' },
      { de: 41, ate: 81, rotulo: 'Alto', severidade: 'ideal' },
      { de: 81, rotulo: 'Muito alto', descricao: 'Risco ambiental de perda por escoamento', severidade: 'atencao' },
    ],
  },
  {
    id: 'leg-k', codigo: 'LEG-K', nome: 'Potássio trocável',
    parametroId: idDe('K'), fonte: 'CFSEMG, 5ª aproximação', padrao: true, ativa: true,
    faixas: [
      { ate: 16, rotulo: 'Muito baixo', severidade: 'critico' },
      { de: 16, ate: 41, rotulo: 'Baixo', severidade: 'atencao' },
      { de: 41, ate: 71, rotulo: 'Médio', severidade: 'bom' },
      { de: 71, ate: 121, rotulo: 'Alto', severidade: 'ideal' },
      { de: 121, rotulo: 'Muito alto', severidade: 'bom' },
    ],
  },
  {
    id: 'leg-mo', codigo: 'LEG-MO', nome: 'Matéria orgânica',
    parametroId: idDe('MO'), fonte: 'CFSEMG, 5ª aproximação', padrao: true, ativa: true,
    faixas: [
      { ate: 15, rotulo: 'Baixo', severidade: 'atencao' },
      { de: 15, ate: 31, rotulo: 'Médio', severidade: 'bom' },
      { de: 31, rotulo: 'Alto', severidade: 'ideal' },
    ],
  },
  {
    id: 'leg-v', codigo: 'LEG-V', nome: 'Saturação por bases',
    parametroId: idDe('V'), fonte: 'CFSEMG, 5ª aproximação', padrao: true, ativa: true,
    faixas: [
      { ate: 21, rotulo: 'Muito baixo', severidade: 'critico' },
      { de: 21, ate: 41, rotulo: 'Baixo', severidade: 'critico' },
      { de: 41, ate: 61, rotulo: 'Médio', severidade: 'atencao' },
      { de: 61, ate: 81, rotulo: 'Bom', descricao: 'Faixa alvo para a maioria das lavouras anuais', severidade: 'ideal' },
      { de: 81, rotulo: 'Muito alto', severidade: 'bom' },
    ],
  },
  {
    id: 'leg-ph-agua-conama', codigo: 'LEG-PH-CONAMA', nome: 'pH — lançamento de efluente',
    parametroId: idDe('PH-AGUA'), fonte: 'CONAMA 430/2011, art. 16', padrao: true, ativa: true,
    faixas: [
      { ate: 5, rotulo: 'Fora do padrão', descricao: 'Abaixo do limite de lançamento', severidade: 'critico' },
      { de: 5, ate: 9, rotulo: 'Conforme', descricao: 'Dentro do padrão de lançamento', severidade: 'ideal' },
      { de: 9, rotulo: 'Fora do padrão', descricao: 'Acima do limite de lançamento', severidade: 'critico' },
    ],
  },

  {
    id: 'leg-ca', codigo: 'LEG-CA', nome: 'Cálcio trocável',
    parametroId: idDe('CA'), fonte: 'CFSEMG, 5ª aproximação', padrao: true, ativa: true,
    faixas: [
      { ate: 0.41, rotulo: 'Muito baixo', severidade: 'critico' },
      { de: 0.41, ate: 1.21, rotulo: 'Baixo', severidade: 'atencao' },
      { de: 1.21, ate: 2.41, rotulo: 'Médio', severidade: 'bom' },
      { de: 2.41, ate: 4.01, rotulo: 'Bom', severidade: 'ideal' },
      { de: 4.01, rotulo: 'Muito bom', severidade: 'bom' },
    ],
  },
  {
    id: 'leg-mg', codigo: 'LEG-MG', nome: 'Magnésio trocável',
    parametroId: idDe('MG'), fonte: 'CFSEMG, 5ª aproximação', padrao: true, ativa: true,
    faixas: [
      { ate: 0.16, rotulo: 'Muito baixo', severidade: 'critico' },
      { de: 0.16, ate: 0.46, rotulo: 'Baixo', severidade: 'atencao' },
      { de: 0.46, ate: 0.91, rotulo: 'Médio', severidade: 'bom' },
      { de: 0.91, ate: 1.51, rotulo: 'Bom', severidade: 'ideal' },
      { de: 1.51, rotulo: 'Muito bom', severidade: 'bom' },
    ],
  },
  {
    id: 'leg-sb', codigo: 'LEG-SB', nome: 'Soma de bases',
    parametroId: idDe('SB'), fonte: 'CFSEMG, 5ª aproximação', padrao: true, ativa: true,
    faixas: [
      { ate: 0.61, rotulo: 'Muito baixo', severidade: 'critico' },
      { de: 0.61, ate: 1.81, rotulo: 'Baixo', severidade: 'atencao' },
      { de: 1.81, ate: 3.61, rotulo: 'Médio', severidade: 'bom' },
      { de: 3.61, ate: 6.01, rotulo: 'Bom', severidade: 'ideal' },
      { de: 6.01, rotulo: 'Muito bom', severidade: 'bom' },
    ],
  },
  {
    id: 'leg-ctc', codigo: 'LEG-CTC', nome: 'CTC a pH 7,0',
    parametroId: idDe('CTC'), fonte: 'CFSEMG, 5ª aproximação', padrao: true, ativa: true,
    faixas: [
      { ate: 1.61, rotulo: 'Muito baixo', severidade: 'critico' },
      { de: 1.61, ate: 4.31, rotulo: 'Baixo', severidade: 'atencao' },
      { de: 4.31, ate: 8.61, rotulo: 'Médio', severidade: 'bom' },
      { de: 8.61, ate: 15.01, rotulo: 'Bom', severidade: 'ideal' },
      { de: 15.01, rotulo: 'Muito bom', severidade: 'bom' },
    ],
  },
  {
    id: 'leg-hal', codigo: 'LEG-HAL', nome: 'Acidez potencial (H+Al)',
    parametroId: idDe('H+AL'), fonte: 'CFSEMG, 5ª aproximação', padrao: true, ativa: true,
    faixas: [
      { ate: 1.01, rotulo: 'Muito baixa', severidade: 'ideal' },
      { de: 1.01, ate: 2.51, rotulo: 'Baixa', severidade: 'bom' },
      { de: 2.51, ate: 5.01, rotulo: 'Média', severidade: 'atencao' },
      { de: 5.01, ate: 9.01, rotulo: 'Alta', descricao: 'Calagem indicada', severidade: 'critico' },
      { de: 9.01, rotulo: 'Muito alta', descricao: 'Calagem pesada indicada', severidade: 'critico' },
    ],
  },
  {
    id: 'leg-al', codigo: 'LEG-AL', nome: 'Alumínio trocável',
    parametroId: idDe('AL'), fonte: 'CFSEMG, 5ª aproximação', padrao: true, ativa: true,
    faixas: [
      { ate: 0.21, rotulo: 'Muito baixo', severidade: 'ideal' },
      { de: 0.21, ate: 0.51, rotulo: 'Baixo', severidade: 'bom' },
      { de: 0.51, ate: 1.01, rotulo: 'Médio', severidade: 'atencao' },
      { de: 1.01, ate: 2.01, rotulo: 'Alto', descricao: 'Risco de toxidez por alumínio', severidade: 'critico' },
      { de: 2.01, rotulo: 'Muito alto', descricao: 'Toxidez por alumínio provável', severidade: 'critico' },
    ],
  },
  {
    id: 'leg-m', codigo: 'LEG-M', nome: 'Saturação por alumínio',
    parametroId: idDe('M'), fonte: 'CFSEMG, 5ª aproximação', padrao: true, ativa: true,
    faixas: [
      { ate: 15.1, rotulo: 'Muito baixa', descricao: 'Sem restrição ao desenvolvimento radicular', severidade: 'ideal' },
      { de: 15.1, ate: 30.1, rotulo: 'Baixa', severidade: 'bom' },
      { de: 30.1, ate: 50.1, rotulo: 'Média', severidade: 'atencao' },
      { de: 50.1, ate: 75.1, rotulo: 'Alta', descricao: 'Restrição ao crescimento de raízes', severidade: 'critico' },
      { de: 75.1, rotulo: 'Muito alta', descricao: 'Restrição severa — calagem urgente', severidade: 'critico' },
    ],
  },
  {
    id: 'leg-s', codigo: 'LEG-S', nome: 'Enxofre disponível',
    parametroId: idDe('S'), fonte: 'CFSEMG, 5ª aproximação', padrao: true, ativa: true,
    faixas: [
      { ate: 2.1, rotulo: 'Muito baixo', severidade: 'critico' },
      { de: 2.1, ate: 5.1, rotulo: 'Baixo', severidade: 'atencao' },
      { de: 5.1, ate: 10.1, rotulo: 'Médio', severidade: 'bom' },
      { de: 10.1, ate: 20.1, rotulo: 'Bom', severidade: 'ideal' },
      { de: 20.1, rotulo: 'Muito bom', severidade: 'bom' },
    ],
  },
  {
    id: 'leg-b', codigo: 'LEG-B', nome: 'Boro disponível',
    parametroId: idDe('B'), fonte: 'CFSEMG, 5ª aproximação', padrao: true, ativa: true,
    faixas: [
      { ate: 0.16, rotulo: 'Muito baixo', severidade: 'critico' },
      { de: 0.16, ate: 0.36, rotulo: 'Baixo', severidade: 'atencao' },
      { de: 0.36, ate: 0.61, rotulo: 'Médio', severidade: 'bom' },
      { de: 0.61, ate: 0.91, rotulo: 'Bom', severidade: 'ideal' },
      { de: 0.91, rotulo: 'Muito bom', severidade: 'bom' },
    ],
  },
  {
    id: 'leg-cu', codigo: 'LEG-CU', nome: 'Cobre disponível',
    parametroId: idDe('CU'), fonte: 'CFSEMG, 5ª aproximação', padrao: true, ativa: true,
    faixas: [
      { ate: 0.4, rotulo: 'Muito baixo', severidade: 'critico' },
      { de: 0.4, ate: 0.8, rotulo: 'Baixo', severidade: 'atencao' },
      { de: 0.8, ate: 1.3, rotulo: 'Médio', severidade: 'bom' },
      { de: 1.3, ate: 1.9, rotulo: 'Bom', severidade: 'ideal' },
      { de: 1.9, rotulo: 'Muito bom', severidade: 'bom' },
    ],
  },
  {
    id: 'leg-fe', codigo: 'LEG-FE', nome: 'Ferro disponível',
    parametroId: idDe('FE'), fonte: 'CFSEMG, 5ª aproximação', padrao: true, ativa: true,
    faixas: [
      { ate: 9, rotulo: 'Muito baixo', severidade: 'critico' },
      { de: 9, ate: 19, rotulo: 'Baixo', severidade: 'atencao' },
      { de: 19, ate: 31, rotulo: 'Médio', severidade: 'bom' },
      { de: 31, ate: 46, rotulo: 'Bom', severidade: 'ideal' },
      { de: 46, rotulo: 'Muito bom', severidade: 'bom' },
    ],
  },
  {
    id: 'leg-mn', codigo: 'LEG-MN', nome: 'Manganês disponível',
    parametroId: idDe('MN'), fonte: 'CFSEMG, 5ª aproximação', padrao: true, ativa: true,
    faixas: [
      { ate: 3, rotulo: 'Muito baixo', severidade: 'critico' },
      { de: 3, ate: 6, rotulo: 'Baixo', severidade: 'atencao' },
      { de: 6, ate: 9, rotulo: 'Médio', severidade: 'bom' },
      { de: 9, ate: 13, rotulo: 'Bom', severidade: 'ideal' },
      { de: 13, rotulo: 'Muito bom', severidade: 'bom' },
    ],
  },
  {
    id: 'leg-zn', codigo: 'LEG-ZN', nome: 'Zinco disponível',
    parametroId: idDe('ZN'), fonte: 'CFSEMG, 5ª aproximação', padrao: true, ativa: true,
    faixas: [
      { ate: 0.5, rotulo: 'Muito baixo', severidade: 'critico' },
      { de: 0.5, ate: 1.0, rotulo: 'Baixo', severidade: 'atencao' },
      { de: 1.0, ate: 1.6, rotulo: 'Médio', severidade: 'bom' },
      { de: 1.6, ate: 2.3, rotulo: 'Bom', severidade: 'ideal' },
      { de: 2.3, rotulo: 'Muito bom', severidade: 'bom' },
    ],
  },
  {
    id: 'leg-arg', codigo: 'LEG-ARG', nome: 'Classe textural',
    parametroId: idDe('ARG'), fonte: 'Embrapa — Sistema Brasileiro de Classificação de Solos', padrao: true, ativa: true,
    faixas: [
      { ate: 151, rotulo: 'Arenosa', descricao: 'Baixa retenção de água e nutrientes', severidade: 'atencao' },
      { de: 151, ate: 351, rotulo: 'Média', severidade: 'bom' },
      { de: 351, ate: 601, rotulo: 'Argilosa', severidade: 'ideal' },
      { de: 601, rotulo: 'Muito argilosa', descricao: 'Alta retenção — atenção ao preparo', severidade: 'bom' },
    ],
  },
  {
    id: 'leg-prnt', codigo: 'LEG-PRNT', nome: 'PRNT do corretivo',
    parametroId: idDe('PRNT'), fonte: 'IN SDA 05/2007', padrao: true, ativa: true,
    faixas: [
      { ate: 45, rotulo: 'Fora de especificação', descricao: 'Abaixo do mínimo legal de 45 %', severidade: 'critico' },
      { de: 45, ate: 60, rotulo: 'Classe C', severidade: 'atencao' },
      { de: 60, ate: 80, rotulo: 'Classe B', severidade: 'bom' },
      { de: 80, rotulo: 'Classe A', severidade: 'ideal' },
    ],
  },
  {
    id: 'leg-pb', codigo: 'LEG-PB', nome: 'Proteína bruta da forragem',
    parametroId: idDe('PB'), fonte: 'NRC — exigência de ruminantes', padrao: true, ativa: true,
    faixas: [
      { ate: 7, rotulo: 'Limitante', descricao: 'Abaixo de 7 % compromete a fermentação ruminal', severidade: 'critico' },
      { de: 7, ate: 12, rotulo: 'Baixa', severidade: 'atencao' },
      { de: 12, ate: 18, rotulo: 'Adequada', severidade: 'ideal' },
      { de: 18, rotulo: 'Alta', severidade: 'bom' },
    ],
  },
  {
    id: 'leg-fdn', codigo: 'LEG-FDN', nome: 'Fibra em detergente neutro',
    parametroId: idDe('FDN'), fonte: 'Van Soest — consumo de matéria seca', padrao: true, ativa: true,
    faixas: [
      { ate: 55, rotulo: 'Baixa', severidade: 'ideal' },
      { de: 55, ate: 65, rotulo: 'Média', severidade: 'bom' },
      { de: 65, rotulo: 'Alta', descricao: 'Acima de 65 % limita o consumo voluntário', severidade: 'atencao' },
    ],
  },
  {
    id: 'leg-germ', codigo: 'LEG-GERM', nome: 'Germinação',
    parametroId: idDe('GERM'), fonte: 'MAPA — padrão de comercialização de sementes', padrao: true, ativa: true,
    faixas: [
      { ate: 70, rotulo: 'Reprovado', descricao: 'Abaixo do padrão mínimo para comercialização', severidade: 'critico' },
      { de: 70, ate: 80, rotulo: 'Limítrofe', severidade: 'atencao' },
      { de: 80, rotulo: 'Aprovado', severidade: 'ideal' },
    ],
  },
];

/* ---------------- Cadastros simples ---------------- */

export const metodologias: Metodologia[] = [
  { id: 'met-01', codigo: 'POP-ACI-004', nome: 'Potenciometria em suspensão de solo', norma: 'Embrapa 2017', versao: '4.2', vigenteDesde: diasAtras(420), ativa: true },
  { id: 'met-02', codigo: 'POP-ACI-007', nome: 'pH em CaCl₂ 0,01 mol/L', norma: 'IAC Boletim 100', versao: '2.1', vigenteDesde: diasAtras(300), ativa: true },
  { id: 'met-03', codigo: 'POP-FER-011', nome: 'Fósforo por Mehlich-1 e colorimetria', norma: 'Embrapa 2017', versao: '3.0', vigenteDesde: diasAtras(260), ativa: true },
  { id: 'met-04', codigo: 'POP-FER-014', nome: 'Potássio por fotometria de chama', norma: 'Embrapa 2017', versao: '2.4', vigenteDesde: diasAtras(240), ativa: true },
  { id: 'met-05', codigo: 'POP-ORG-002', nome: 'Matéria orgânica por Walkley-Black', norma: 'Embrapa 2017', versao: '1.8', vigenteDesde: diasAtras(510), ativa: true },
  { id: 'met-06', codigo: 'POP-AGU-021', nome: 'pH em água e efluente', norma: 'SMEWW 4500-H⁺ B', versao: '23ª ed.', vigenteDesde: diasAtras(180), ativa: true },
  { id: 'met-07', codigo: 'POP-COR-005', nome: 'PRNT de corretivos', norma: 'IN SDA 05/2007', versao: '2.0', vigenteDesde: diasAtras(600), ativa: true },
];

export const bandejas: Bandeja[] = [
  { id: 'ban-01', codigo: 'B05', nome: 'Bandeja de acidez 05', linhas: 10, colunas: 4, setor: 'Bancada de Acidez', ativa: true },
  { id: 'ban-02', codigo: 'B06', nome: 'Bandeja de acidez 06', linhas: 10, colunas: 4, setor: 'Bancada de Acidez', ativa: true },
  { id: 'ban-03', codigo: 'B12', nome: 'Bandeja de extração 12', linhas: 12, colunas: 5, setor: 'Extração', ativa: true },
  { id: 'ban-04', codigo: 'B20', nome: 'Bandeja de foliar 20', linhas: 8, colunas: 6, setor: 'Foliar', ativa: true },
  { id: 'ban-05', codigo: 'B24', nome: 'Bandeja de úmidos 24', linhas: 6, colunas: 4, setor: 'Físico-Química', ativa: false },
];

export const profundidades: ItemSimples[] = [
  { id: 'prf-01', codigo: '0-20', nome: '0 a 20 cm', ativo: true, observacao: 'Camada arável — padrão da amostragem de fertilidade' },
  { id: 'prf-02', codigo: '20-40', nome: '20 a 40 cm', ativo: true },
  { id: 'prf-03', codigo: '40-60', nome: '40 a 60 cm', ativo: true, observacao: 'Avaliação de alumínio em subsuperfície' },
  { id: 'prf-04', codigo: '0-10', nome: '0 a 10 cm', ativo: true, observacao: 'Plantio direto consolidado' },
  { id: 'prf-05', codigo: '60-80', nome: '60 a 80 cm', ativo: false },
];

export const culturas: ItemSimples[] = [
  { id: 'cul-01', codigo: 'SOJA', nome: 'Soja', ativo: true },
  { id: 'cul-02', codigo: 'MILHO2', nome: 'Milho 2ª safra', ativo: true },
  { id: 'cul-03', codigo: 'ALGODAO', nome: 'Algodão', ativo: true },
  { id: 'cul-04', codigo: 'CANA', nome: 'Cana-de-açúcar', ativo: true },
  { id: 'cul-05', codigo: 'CAFE', nome: 'Café', ativo: true },
  { id: 'cul-06', codigo: 'PASTO', nome: 'Pastagem', ativo: true },
  { id: 'cul-07', codigo: 'FEIJAO', nome: 'Feijão', ativo: true },
  { id: 'cul-08', codigo: 'SORGO', nome: 'Sorgo', ativo: true },
];

export const tiposCliente: ItemSimples[] = [
  { id: 'tcl-01', codigo: 'PROD', nome: 'Produtor rural', ativo: true },
  { id: 'tcl-02', codigo: 'USINA', nome: 'Usina', ativo: true },
  { id: 'tcl-03', codigo: 'COOP', nome: 'Cooperativa', ativo: true },
  { id: 'tcl-04', codigo: 'REVENDA', nome: 'Revenda de insumos', ativo: true },
  { id: 'tcl-05', codigo: 'CONSULT', nome: 'Consultoria agronômica', ativo: true },
  { id: 'tcl-06', codigo: 'INDUSTRIA', nome: 'Indústria', ativo: true },
  { id: 'tcl-07', codigo: 'ORGAO', nome: 'Órgão público', ativo: true },
];

export const convenios: Convenio[] = [
  { id: 'cnv-01', codigo: 'COOP-OESTE', nome: 'Cooperativa Agroindustrial do Oeste', desconto: 18, tabelaPrecoId: 'tab-coop', ativo: true, validoAte: diasAFrente(210) },
  { id: 'cnv-02', codigo: 'SAFRA-25', nome: 'Contrato safra 25/26', desconto: 25, tabelaPrecoId: 'tab-contrato', ativo: true, validoAte: diasAFrente(120) },
  { id: 'cnv-03', codigo: 'PARC-VOL', nome: 'Parceria por volume', desconto: 12, tabelaPrecoId: 'tab-parceiro', ativo: true },
  { id: 'cnv-04', codigo: 'EMBRAPA', nome: 'Convênio de pesquisa', desconto: 40, ativo: false, validoAte: diasAtras(60), observacao: 'Encerrado — renovação em análise' },
];

export const regrasDesconto: RegraDesconto[] = [
  { id: 'dsc-01', codigo: 'VOL-50', nome: 'A partir de 50 amostras', quantidadeMinima: 50, percentual: 5, ativo: true },
  { id: 'dsc-02', codigo: 'VOL-200', nome: 'A partir de 200 amostras', quantidadeMinima: 200, percentual: 10, ativo: true },
  { id: 'dsc-03', codigo: 'VOL-500', nome: 'A partir de 500 amostras', quantidadeMinima: 500, percentual: 15, ativo: true },
  { id: 'dsc-04', codigo: 'VOL-1000', nome: 'A partir de 1.000 amostras', quantidadeMinima: 1000, percentual: 20, ativo: true },
];

export const observacoesFixas: ItemSimples[] = [
  { id: 'obs-01', codigo: 'OBS-AMOSTRAGEM', nome: 'Os resultados referem-se exclusivamente às amostras recebidas e identificadas neste documento.', ativo: true },
  { id: 'obs-02', codigo: 'OBS-REPRODUCAO', nome: 'A reprodução parcial deste laudo só é permitida com autorização escrita do laboratório.', ativo: true },
  { id: 'obs-03', codigo: 'OBS-COLETA', nome: 'A coleta foi realizada pelo cliente; o laboratório não se responsabiliza pela representatividade da amostra.', ativo: true },
  { id: 'obs-04', codigo: 'OBS-SUBCONTRATADO', nome: 'Ensaio subcontratado a laboratório parceiro, identificado no corpo do laudo.', ativo: true },
  { id: 'obs-05', codigo: 'OBS-FORA-ESCOPO', nome: 'Ensaio fora do escopo de acreditação.', ativo: true },
];

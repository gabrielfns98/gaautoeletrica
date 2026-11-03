/* ============================================================
   BANCADA — catálogo de referência

   O que o sistema traz de fábrica e o laboratório recebe pronto:
   grupos de análise, elementos com método e LQ, pacotes, faixas de
   interpretação do CFSEMG e do Boletim 100, fórmulas dos
   calculados, modelos de laudo, famílias de equipamento e as
   tabelas de recomendação agronômica.

   Nada aqui é exemplo nem enfeite: são normas publicadas e
   convenções do setor. Tudo é editável nos Cadastros, porque cada
   laboratório ajusta o que assina — mas sem isto pronto, o
   primeiro dia de uso seria cadastrar trezentos registros antes de
   lançar um resultado.

   O que NÃO está aqui é tudo que pertence a um laboratório
   específico: clientes, amostras, laudos, equipamentos, estoque,
   títulos. Um sistema recém-instalado não tem nada disso, e
   inventar é o que faz uma demonstração parecer um sistema em uso.
   Isso vive em `demonstracao.ts`, e só carrega quando pedido.
   ============================================================ */

import { PAPEIS_PADRAO } from '../lib/rbac';
import type {
  Bandeja, CriterioAceitacao, DosePorClasse, Formula, GrupoAnalise,
  GrupoAnaliseId, ItemSimples, Legenda, Metodologia, Metodologia as _Met,
  ModeloImportacao, ModeloLaudo, Papel, Parametro, ProgramaProficiencia,
  RecomendacaoCultura, TabelaRecomendacao, TipoAnalise, TipoEquipamento,
  Unidade, Usuario,
} from '../types';

/* ---------------- Unidade ---------------- */

/**
 * A unidade que o laboratório preenche com os próprios dados na
 * primeira configuração. Um sistema precisa de pelo menos uma —
 * é ela que timbra o laudo e numera o protocolo —, então ela nasce
 * em branco em vez de não existir.
 */
export const unidades: Unidade[] = [
  {
    id: 'un-01', codigo: '01', sigla: 'MATRIZ', nome: 'Minha unidade',
    cnpj: '', municipio: '', uf: '',
    responsavelTecnico: '', crq: '',
  },
];

/* ---------------- Papéis e primeiro usuário ---------------- */

export const papeis: Papel[] = PAPEIS_PADRAO;

/**
 * O administrador que entra na primeira vez e cadastra a equipe.
 * Sem nenhum usuário não há como abrir o sistema, e um com nome
 * inventado seria exatamente o placeholder que não queremos.
 */
export const usuarios: Usuario[] = [
  {
    id: 'usr-01',
    nome: 'Administrador',
    email: '',
    cargo: 'Administrador do sistema',
    papelId: 'papel-admin',
    unidadeIds: ['un-01'],
    ativo: true,
    iniciais: 'AD',
    habilitacoes: [],
    mfa: false,
  },
];

export const usuarioAtual = usuarios[0];

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
  { id: 'par-n-total', codigo: 'N-TOT', nome: 'N Total', grupoId: 'fertilizantes', unidade: '%', tipo: 'numerico', metodo: 'IN SDA CAP. I C 1.3', casasDecimais: 2, lq: 0.1, preco: 32.0, ativo: true },

  /* O escopo que o laboratório entrega num laudo de fertilizante.
     Os códigos de método são os da IN SDA, escritos de um jeito só —
     nos laudos atuais o mesmo método aparece como "IN SDA CAP. 1 C 1.3",
     "IN SDA CAP. I C 2" e "IN CAP. 1 C 11.2". */
  { id: 'par-n-amoniacal', codigo: 'N-AMON', nome: 'N Amoniacal', grupoId: 'fertilizantes', unidade: '%', tipo: 'numerico', metodo: 'IN SDA CAP. I C 1', casasDecimais: 2, lq: 0.1, preco: 28.0, ativo: true },
  { id: 'par-n-nitrico', codigo: 'N-NITR', nome: 'N Nítrico', grupoId: 'fertilizantes', unidade: '%', tipo: 'numerico', metodo: 'IN SDA CAP. I C 1', casasDecimais: 2, lq: 0.1, preco: 28.0, ativo: true },
  { id: 'par-p2o5-total', codigo: 'P2O5-TOT', nome: 'P2O5 Total', grupoId: 'fertilizantes', unidade: '%', tipo: 'numerico', metodo: 'IN SDA CAP. I C 2', casasDecimais: 2, lq: 0.1, preco: 34.0, ativo: true },
  { id: 'par-p2o5-h2o', codigo: 'P2O5-H2O', nome: 'P2O5 solúvel em água', grupoId: 'fertilizantes', unidade: '%', tipo: 'numerico', metodo: 'IN SDA CAP. I C 3', casasDecimais: 2, lq: 0.1, preco: 32.0, ativo: true },
  { id: 'par-k2o-h2o', codigo: 'K2O-H2O', nome: 'K2O solúvel em água', grupoId: 'fertilizantes', unidade: '%', tipo: 'numerico', metodo: 'IN SDA CAP. I C 8.1.2', casasDecimais: 2, lq: 0.1, preco: 30.0, ativo: true },
  { id: 'par-ca-fert', codigo: 'CA-FERT', nome: 'Ca Total', grupoId: 'fertilizantes', unidade: '%', tipo: 'numerico', metodo: 'IN SDA CAP. I C 9.2', casasDecimais: 2, lq: 0.1, preco: 24.0, ativo: true },
  { id: 'par-mg-fert', codigo: 'MG-FERT', nome: 'Mg Total', grupoId: 'fertilizantes', unidade: '%', tipo: 'numerico', metodo: 'IN SDA CAP. I C 9.3', casasDecimais: 2, lq: 0.1, preco: 24.0, ativo: true },
  { id: 'par-s-fert', codigo: 'S-FERT', nome: 'S Total (SO4)', grupoId: 'fertilizantes', unidade: '%', tipo: 'numerico', metodo: 'IN SDA CAP. I C 10', casasDecimais: 2, lq: 0.1, preco: 26.0, ativo: true },
  { id: 'par-b-fert', codigo: 'B-FERT', nome: 'B Total', grupoId: 'fertilizantes', unidade: '%', tipo: 'numerico', metodo: 'IN SDA CAP. I C 11.2', casasDecimais: 3, lq: 0.01, preco: 26.0, ativo: true },
  { id: 'par-zn-fert', codigo: 'ZN-FERT', nome: 'Zn Total', grupoId: 'fertilizantes', unidade: '%', tipo: 'numerico', metodo: 'IN SDA CAP. I C 12', casasDecimais: 3, lq: 0.01, preco: 22.0, ativo: true },
  { id: 'par-cu-fert', codigo: 'CU-FERT', nome: 'Cu Total', grupoId: 'fertilizantes', unidade: '%', tipo: 'numerico', metodo: 'IN SDA CAP. I C 12', casasDecimais: 3, lq: 0.01, preco: 22.0, ativo: true },
  { id: 'par-umidade-fert', codigo: 'UMID-FERT', nome: 'Umidade', grupoId: 'fertilizantes', unidade: '%', tipo: 'numerico', metodo: 'Método da estufa', casasDecimais: 1, lq: 0.1, preco: 14.0, ativo: true },
  { id: 'par-agua-livre', codigo: 'AGUA-LIV', nome: 'Água Livre', grupoId: 'fertilizantes', unidade: '%', tipo: 'numerico', metodo: 'ANDA — água livre', casasDecimais: 2, lq: 0.1, preco: 18.0, ativo: true },
  { id: 'par-acidez-livre', codigo: 'ACIDEZ', nome: 'Acidez Livre', grupoId: 'fertilizantes', unidade: '%', tipo: 'numerico', metodo: 'ANDA — acidez livre', casasDecimais: 2, lq: 0.1, preco: 18.0, ativo: true },
  { id: 'par-dureza', codigo: 'DUREZA', nome: 'Dureza', grupoId: 'fertilizantes', unidade: 'Kgf/cm²', tipo: 'numerico', metodo: 'ANDA — dureza do grânulo', casasDecimais: 2, lq: 0.1, preco: 20.0, ativo: true },
  { id: 'par-gran-004', codigo: 'GRAN-004', nome: '# 004 — 4,75 mm — Passante', grupoId: 'fertilizantes', unidade: '%', tipo: 'numerico', metodo: 'IN SDA CAP. I B', casasDecimais: 2, lq: 0.1, preco: 16.0, ativo: true },
  { id: 'par-gran-010', codigo: 'GRAN-010', nome: '# 010 — 2,00 mm — Passante', grupoId: 'fertilizantes', unidade: '%', tipo: 'numerico', metodo: 'IN SDA CAP. I B', casasDecimais: 2, lq: 0.1, preco: 16.0, ativo: true },
  { id: 'par-gran-018', codigo: 'GRAN-018', nome: '# 018 — 1,00 mm — Passante', grupoId: 'fertilizantes', unidade: '%', tipo: 'numerico', metodo: 'IN SDA CAP. I B', casasDecimais: 2, lq: 0.1, preco: 16.0, ativo: true },
  { id: 'par-gran-fundo', codigo: 'GRAN-FUNDO', nome: 'Fundo', grupoId: 'fertilizantes', unidade: '%', tipo: 'numerico', metodo: 'IN SDA CAP. I B', casasDecimais: 2, lq: 0.1, preco: 16.0, ativo: true },
  { id: 'par-as-fert', codigo: 'AS-FERT', nome: 'As Total', grupoId: 'fertilizantes', unidade: 'mg/kg', tipo: 'numerico', metodo: 'IN SDA CAP. I C 27', casasDecimais: 2, lq: 0.1, preco: 48.0, ativo: true },
  { id: 'par-hg-fert', codigo: 'HG-FERT', nome: 'Hg Total', grupoId: 'fertilizantes', unidade: 'mg/kg', tipo: 'numerico', metodo: 'IN SDA CAP. I C 28.1', casasDecimais: 2, lq: 0.1, preco: 52.0, ativo: true },
  { id: 'par-cd-fert', codigo: 'CD-FERT', nome: 'Cd Total', grupoId: 'fertilizantes', unidade: 'mg/kg', tipo: 'numerico', metodo: 'U.S.EPA 3050-B', casasDecimais: 2, lq: 0.1, preco: 46.0, ativo: true },
  { id: 'par-cr-fert', codigo: 'CR-FERT', nome: 'Cr Total', grupoId: 'fertilizantes', unidade: 'mg/kg', tipo: 'numerico', metodo: 'IN SDA CAP. I C 25', casasDecimais: 2, lq: 0.1, preco: 44.0, ativo: true },
  { id: 'par-pb-fert', codigo: 'PB-FERT', nome: 'Pb Total', grupoId: 'fertilizantes', unidade: 'mg/kg', tipo: 'numerico', metodo: 'IN SDA CAP. I C 25', casasDecimais: 2, lq: 0.1, preco: 44.0, ativo: true },
  { id: 'par-co-fert', codigo: 'CO-FERT', nome: 'C.O. — Carbono orgânico', grupoId: 'fertilizantes', unidade: '%', tipo: 'numerico', metodo: 'IN SDA CAP. III E 13', casasDecimais: 2, lq: 0.1, preco: 28.0, ativo: true },
  { id: 'par-cn-fert', codigo: 'REL-CN', nome: 'Relação C/N', grupoId: 'fertilizantes', unidade: '', tipo: 'numerico', metodo: 'Cálculo', casasDecimais: 2, ehRelacao: true, preco: 0, ativo: true },
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
export const idDe = (codigo: string) => parametros.find((p) => p.codigo === codigo)?.id ?? '';


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


/* ---------------- Modelos de laudo ---------------- */

/**
 * O timbre e a forma do laudo, por análise. O de solo entrega a
 * interpretação agronômica, que é o que o cliente lê; o de água
 * entrega o número contra o limite legal e dispensa a faixa.
 */
export const modelosLaudo: ModeloLaudo[] = [
  {
    id: 'mdl-geral', nome: 'Padrão do laboratório',
    cabecalho: 'Laudo emitido eletronicamente — confira pelo código de verificação.',
    ordemParametros: [], agrupamento: 'nenhum', layout: 'generico',
    mostrarTabelaReferencia: false,
    observacaoIds: ['obs-01', 'obs-02', 'obs-03'],
    mostrarIncerteza: true, mostrarInterpretacao: true, mostrarMetodos: true,
    cargoAssinatura: 'Responsável técnico', disposicaoPadrao: 'amostra', ativo: true,
  },
  {
    id: 'mdl-solo', nome: 'Solo — fertilidade',
    grupoId: 'solo',
    // A ordem que o agrônomo lê: acidez, matéria orgânica, macro, micro,
    // e por último os calculados que resumem o conjunto.
    ordemParametros: [
      'PH-H2O', 'PH-CACL2', 'PH-SMP', 'MO', 'P-MEL', 'P-RES', 'K', 'CA', 'MG',
      'S', 'H+AL', 'AL', 'B', 'CU', 'FE', 'MN', 'ZN', 'NA',
      'SB', 'CTC', 'V', 'M', 'ARG',
    ].map(idDe).filter(Boolean),
    agrupamento: 'nenhum', layout: 'generico', mostrarTabelaReferencia: false,
    observacaoIds: ['obs-01', 'obs-03'],
    mostrarIncerteza: true, mostrarInterpretacao: true, mostrarMetodos: true,
    cargoAssinatura: 'Responsável técnico', disposicaoPadrao: 'amostra', ativo: true,
  },
  {
    id: 'mdl-agua', nome: 'Água e efluentes',
    grupoId: 'agua-efluentes',
    ordemParametros: ['PH-AGUA', 'CE', 'TURB', 'DBO', 'DQO'].map(idDe).filter(Boolean),
    agrupamento: 'nenhum', layout: 'generico', mostrarTabelaReferencia: false,
    observacaoIds: ['obs-01', 'obs-02'],
    mostrarIncerteza: true,
    // Em água o que vale é o limite legal, não a faixa agronômica.
    mostrarInterpretacao: false,
    mostrarMetodos: true,
    cargoAssinatura: 'Responsável técnico', disposicaoPadrao: 'matriz', ativo: true,
  },
  {
    id: 'mdl-analitico', nome: 'Laudo Analítico — fertilizantes e corretivos',
    grupoId: 'fertilizantes',
    layout: 'analitico',
    registroMapa: 'CCE – MAPA: BA-00959',
    ordemParametros: [], agrupamento: 'nenhum',
    observacaoIds: [],
    mostrarIncerteza: false, mostrarInterpretacao: false, mostrarMetodos: false,
    mostrarTabelaReferencia: false,
    cargoAssinatura: 'Responsável Técnico', disposicaoPadrao: 'amostra', ativo: true,
  },
  {
    id: 'mdl-foliar', nome: 'Tecido Vegetal (Foliar)',
    grupoId: 'foliar',
    layout: 'foliar',
    selo: 'PIATV 2026',
    ordemParametros: [
      'N-FOL', 'P-FOL', 'K-FOL', 'CA-FOL', 'MG-FOL', 'S-FOL',
      'B-FOL', 'CU-FOL', 'FE-FOL', 'MN-FOL', 'ZN-FOL',
    ].map(idDe).filter(Boolean),
    agrupamento: 'nenhum',
    observacaoIds: ['obs-06', 'obs-01', 'obs-07', 'obs-08'],
    mostrarIncerteza: false, mostrarInterpretacao: true, mostrarMetodos: false,
    mostrarTabelaReferencia: true,
    fonteReferencia: 'Boletim Técnico 100, IAC, 2022',
    cargoAssinatura: 'Responsável Técnico — CREA/CRQ',
    disposicaoPadrao: 'amostra', ativo: true,
  },
];


/* ---------------- Fórmulas dos calculados ---------------- */

/**
 * As contas que antes estavam no código. A de H+Al é a da CFSEMG, 5ª
 * aproximação, e é justamente a que muda de estado para estado — o
 * laboratório do Paraná troca os coeficientes pela equação do IAPAR
 * sem pedir nada a ninguém.
 */
export const formulas: Formula[] = [
  {
    id: 'frm-sb', parametroId: idDe('SB'), grupoId: 'solo',
    /* O K vem em mg/dm³ e entra em cmolc/dm³: 391 é a massa equivalente.
       O sódio entra só quando foi determinado — a maioria dos pacotes
       de solo não o pede, e exigi-lo travaria SB, CTC e V% na amostra
       inteira. */
    expressao: 'CA + MG + K / 391 + ou(NA; 0)',
    fonte: 'Soma de bases trocáveis', ativa: true,
  },
  {
    id: 'frm-ctc', parametroId: idDe('CTC'), grupoId: 'solo',
    expressao: 'SB + H+AL',
    fonte: 'CTC a pH 7,0 (T)', ativa: true,
  },
  {
    id: 'frm-v', parametroId: idDe('V'), grupoId: 'solo',
    expressao: 'limite(100 * SB / CTC; 0; 100)',
    fonte: 'Saturação por bases', ativa: true,
  },
  {
    id: 'frm-m', parametroId: idDe('M'), grupoId: 'solo',
    expressao: 'limite(100 * AL / (SB + AL); 0; 100)',
    fonte: 'Saturação por alumínio', ativa: true,
  },
  {
    id: 'frm-hal', parametroId: idDe('H+AL'), grupoId: 'solo',
    expressao: 'exp(7,76 - 1,053 * PH-SMP)',
    fonte: 'CFSEMG, 5ª aproximação — estimativa pelo índice SMP',
    ativa: true,
    observacao: 'Troque os coeficientes pela equação do seu estado.',
  },
  {
    id: 'frm-cn', parametroId: idDe('REL-CN'), grupoId: 'fertilizantes',
    expressao: 'CO-FERT / N-TOT',
    fonte: 'Relação carbono/nitrogênio', ativa: true,
    observacao: 'Adimensional: o laudo não imprime unidade.',
  },
  {
    id: 'frm-ndt', parametroId: idDe('NDT'), grupoId: 'bromatologia',
    expressao: '87,84 - 0,70 * FDA',
    fonte: 'Estimativa a partir da fibra em detergente ácido', ativa: true,
  },
  {
    id: 'frm-prnt', parametroId: idDe('PRNT'), grupoId: 'corretivos-agricolas',
    expressao: 'PN * RE / 100',
    fonte: 'IN SDA 05/2007 — poder relativo de neutralização total',
    ativa: false,
    observacao: 'Inativa: depende do cadastro da reatividade (RE).',
  },
];


/* ---------------- Modelos de importação ---------------- */

/* Data de adoção dos modelos que vêm de fábrica. Fixa, porque o
   catálogo não pode depender de quando o sistema foi aberto. */
const ADOCAO = '2026-01-01';

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
    ativo: true, data: ADOCAO,
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
    ativo: true, data: ADOCAO,
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
    ativo: true, data: ADOCAO,
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
    ativo: true, data: ADOCAO,
  },
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

  /* ---- Faixas foliares por cultura ----
     Vêm dos laudos que o laboratório emite. Duas estavam escritas à
     mão e saíram erradas: "04-20" no Ca da soja e "2,,0-3,0" no S da
     laranja. Como faixa aqui é par de números, nenhuma das duas volta
     a ser possível de escrever. */
  {
    id: 'leg-fol-n-cacau', codigo: 'LEG-N-CACAU',
    nome: 'N foliar — Cacau',
    parametroId: idDe('N-FOL'), cultura: 'CACAU', fonte: 'CEPLAC — diagnose foliar do cacaueiro',
    padrao: false, ativa: true,
    faixas: [
      { ate: 20, rotulo: 'Baixo', severidade: 'critico' },
      { de: 20, ate: 25, rotulo: 'Adequado', severidade: 'ideal' },
      { de: 25, rotulo: 'Alto', severidade: 'atencao' },
    ],
  },
  {
    id: 'leg-fol-p-cacau', codigo: 'LEG-P-CACAU',
    nome: 'P foliar — Cacau',
    parametroId: idDe('P-FOL'), cultura: 'CACAU', fonte: 'CEPLAC — diagnose foliar do cacaueiro',
    padrao: false, ativa: true,
    faixas: [
      { ate: 1.8, rotulo: 'Baixo', severidade: 'critico' },
      { de: 1.8, ate: 2.5, rotulo: 'Adequado', severidade: 'ideal' },
      { de: 2.5, rotulo: 'Alto', severidade: 'atencao' },
    ],
  },
  {
    id: 'leg-fol-k-cacau', codigo: 'LEG-K-CACAU',
    nome: 'K foliar — Cacau',
    parametroId: idDe('K-FOL'), cultura: 'CACAU', fonte: 'CEPLAC — diagnose foliar do cacaueiro',
    padrao: false, ativa: true,
    faixas: [
      { ate: 13, rotulo: 'Baixo', severidade: 'critico' },
      { de: 13, ate: 23, rotulo: 'Adequado', severidade: 'ideal' },
      { de: 23, rotulo: 'Alto', severidade: 'atencao' },
    ],
  },
  {
    id: 'leg-fol-ca-cacau', codigo: 'LEG-CA-CACAU',
    nome: 'CA foliar — Cacau',
    parametroId: idDe('CA-FOL'), cultura: 'CACAU', fonte: 'CEPLAC — diagnose foliar do cacaueiro',
    padrao: false, ativa: true,
    faixas: [
      { ate: 8, rotulo: 'Baixo', severidade: 'critico' },
      { de: 8, ate: 12, rotulo: 'Adequado', severidade: 'ideal' },
      { de: 12, rotulo: 'Alto', severidade: 'atencao' },
    ],
  },
  {
    id: 'leg-fol-mg-cacau', codigo: 'LEG-MG-CACAU',
    nome: 'MG foliar — Cacau',
    parametroId: idDe('MG-FOL'), cultura: 'CACAU', fonte: 'CEPLAC — diagnose foliar do cacaueiro',
    padrao: false, ativa: true,
    faixas: [
      { ate: 3, rotulo: 'Baixo', severidade: 'critico' },
      { de: 3, ate: 7, rotulo: 'Adequado', severidade: 'ideal' },
      { de: 7, rotulo: 'Alto', severidade: 'atencao' },
    ],
  },
  {
    id: 'leg-fol-s-cacau', codigo: 'LEG-S-CACAU',
    nome: 'S foliar — Cacau',
    parametroId: idDe('S-FOL'), cultura: 'CACAU', fonte: 'CEPLAC — diagnose foliar do cacaueiro',
    padrao: false, ativa: true,
    faixas: [
      { ate: 1.6, rotulo: 'Baixo', severidade: 'critico' },
      { de: 1.6, ate: 2, rotulo: 'Adequado', severidade: 'ideal' },
      { de: 2, rotulo: 'Alto', severidade: 'atencao' },
    ],
  },
  {
    id: 'leg-fol-b-cacau', codigo: 'LEG-B-CACAU',
    nome: 'B foliar — Cacau',
    parametroId: idDe('B-FOL'), cultura: 'CACAU', fonte: 'CEPLAC — diagnose foliar do cacaueiro',
    padrao: false, ativa: true,
    faixas: [
      { ate: 25, rotulo: 'Baixo', severidade: 'critico' },
      { de: 25, ate: 60, rotulo: 'Adequado', severidade: 'ideal' },
      { de: 60, rotulo: 'Alto', severidade: 'atencao' },
    ],
  },
  {
    id: 'leg-fol-cu-cacau', codigo: 'LEG-CU-CACAU',
    nome: 'CU foliar — Cacau',
    parametroId: idDe('CU-FOL'), cultura: 'CACAU', fonte: 'CEPLAC — diagnose foliar do cacaueiro',
    padrao: false, ativa: true,
    faixas: [
      { ate: 8, rotulo: 'Baixo', severidade: 'critico' },
      { de: 8, ate: 15, rotulo: 'Adequado', severidade: 'ideal' },
      { de: 15, rotulo: 'Alto', severidade: 'atencao' },
    ],
  },
  {
    id: 'leg-fol-fe-cacau', codigo: 'LEG-FE-CACAU',
    nome: 'FE foliar — Cacau',
    parametroId: idDe('FE-FOL'), cultura: 'CACAU', fonte: 'CEPLAC — diagnose foliar do cacaueiro',
    padrao: false, ativa: true,
    faixas: [
      { ate: 60, rotulo: 'Baixo', severidade: 'critico' },
      { de: 60, ate: 200, rotulo: 'Adequado', severidade: 'ideal' },
      { de: 200, rotulo: 'Alto', severidade: 'atencao' },
    ],
  },
  {
    id: 'leg-fol-mn-cacau', codigo: 'LEG-MN-CACAU',
    nome: 'MN foliar — Cacau',
    parametroId: idDe('MN-FOL'), cultura: 'CACAU', fonte: 'CEPLAC — diagnose foliar do cacaueiro',
    padrao: false, ativa: true,
    faixas: [
      { ate: 50, rotulo: 'Baixo', severidade: 'critico' },
      { de: 50, ate: 250, rotulo: 'Adequado', severidade: 'ideal' },
      { de: 250, rotulo: 'Alto', severidade: 'atencao' },
    ],
  },
  {
    id: 'leg-fol-zn-cacau', codigo: 'LEG-ZN-CACAU',
    nome: 'ZN foliar — Cacau',
    parametroId: idDe('ZN-FOL'), cultura: 'CACAU', fonte: 'CEPLAC — diagnose foliar do cacaueiro',
    padrao: false, ativa: true,
    faixas: [
      { ate: 30, rotulo: 'Baixo', severidade: 'critico' },
      { de: 30, ate: 80, rotulo: 'Adequado', severidade: 'ideal' },
      { de: 80, rotulo: 'Alto', severidade: 'atencao' },
    ],
  },
  {
    id: 'leg-fol-n-cafe', codigo: 'LEG-N-CAFE',
    nome: 'N foliar — Café',
    parametroId: idDe('N-FOL'), cultura: 'CAFE', fonte: 'Boletim Técnico 100, IAC, 2022',
    padrao: false, ativa: true,
    faixas: [
      { ate: 25, rotulo: 'Baixo', severidade: 'critico' },
      { de: 25, ate: 30, rotulo: 'Adequado', severidade: 'ideal' },
      { de: 30, rotulo: 'Alto', severidade: 'atencao' },
    ],
  },
  {
    id: 'leg-fol-p-cafe', codigo: 'LEG-P-CAFE',
    nome: 'P foliar — Café',
    parametroId: idDe('P-FOL'), cultura: 'CAFE', fonte: 'Boletim Técnico 100, IAC, 2022',
    padrao: false, ativa: true,
    faixas: [
      { ate: 1.5, rotulo: 'Baixo', severidade: 'critico' },
      { de: 1.5, ate: 2, rotulo: 'Adequado', severidade: 'ideal' },
      { de: 2, rotulo: 'Alto', severidade: 'atencao' },
    ],
  },
  {
    id: 'leg-fol-k-cafe', codigo: 'LEG-K-CAFE',
    nome: 'K foliar — Café',
    parametroId: idDe('K-FOL'), cultura: 'CAFE', fonte: 'Boletim Técnico 100, IAC, 2022',
    padrao: false, ativa: true,
    faixas: [
      { ate: 20, rotulo: 'Baixo', severidade: 'critico' },
      { de: 20, ate: 30, rotulo: 'Adequado', severidade: 'ideal' },
      { de: 30, rotulo: 'Alto', severidade: 'atencao' },
    ],
  },
  {
    id: 'leg-fol-ca-cafe', codigo: 'LEG-CA-CAFE',
    nome: 'CA foliar — Café',
    parametroId: idDe('CA-FOL'), cultura: 'CAFE', fonte: 'Boletim Técnico 100, IAC, 2022',
    padrao: false, ativa: true,
    faixas: [
      { ate: 10, rotulo: 'Baixo', severidade: 'critico' },
      { de: 10, ate: 15, rotulo: 'Adequado', severidade: 'ideal' },
      { de: 15, rotulo: 'Alto', severidade: 'atencao' },
    ],
  },
  {
    id: 'leg-fol-mg-cafe', codigo: 'LEG-MG-CAFE',
    nome: 'MG foliar — Café',
    parametroId: idDe('MG-FOL'), cultura: 'CAFE', fonte: 'Boletim Técnico 100, IAC, 2022',
    padrao: false, ativa: true,
    faixas: [
      { ate: 3, rotulo: 'Baixo', severidade: 'critico' },
      { de: 3, ate: 5, rotulo: 'Adequado', severidade: 'ideal' },
      { de: 5, rotulo: 'Alto', severidade: 'atencao' },
    ],
  },
  {
    id: 'leg-fol-s-cafe', codigo: 'LEG-S-CAFE',
    nome: 'S foliar — Café',
    parametroId: idDe('S-FOL'), cultura: 'CAFE', fonte: 'Boletim Técnico 100, IAC, 2022',
    padrao: false, ativa: true,
    faixas: [
      { ate: 1.5, rotulo: 'Baixo', severidade: 'critico' },
      { de: 1.5, ate: 2, rotulo: 'Adequado', severidade: 'ideal' },
      { de: 2, rotulo: 'Alto', severidade: 'atencao' },
    ],
  },
  {
    id: 'leg-fol-b-cafe', codigo: 'LEG-B-CAFE',
    nome: 'B foliar — Café',
    parametroId: idDe('B-FOL'), cultura: 'CAFE', fonte: 'Boletim Técnico 100, IAC, 2022',
    padrao: false, ativa: true,
    faixas: [
      { ate: 60, rotulo: 'Baixo', severidade: 'critico' },
      { de: 60, ate: 100, rotulo: 'Adequado', severidade: 'ideal' },
      { de: 100, rotulo: 'Alto', severidade: 'atencao' },
    ],
  },
  {
    id: 'leg-fol-cu-cafe', codigo: 'LEG-CU-CAFE',
    nome: 'CU foliar — Café',
    parametroId: idDe('CU-FOL'), cultura: 'CAFE', fonte: 'Boletim Técnico 100, IAC, 2022',
    padrao: false, ativa: true,
    faixas: [
      { ate: 10, rotulo: 'Baixo', severidade: 'critico' },
      { de: 10, ate: 20, rotulo: 'Adequado', severidade: 'ideal' },
      { de: 20, rotulo: 'Alto', severidade: 'atencao' },
    ],
  },
  {
    id: 'leg-fol-fe-cafe', codigo: 'LEG-FE-CAFE',
    nome: 'FE foliar — Café',
    parametroId: idDe('FE-FOL'), cultura: 'CAFE', fonte: 'Boletim Técnico 100, IAC, 2022',
    padrao: false, ativa: true,
    faixas: [
      { ate: 50, rotulo: 'Baixo', severidade: 'critico' },
      { de: 50, ate: 200, rotulo: 'Adequado', severidade: 'ideal' },
      { de: 200, rotulo: 'Alto', severidade: 'atencao' },
    ],
  },
  {
    id: 'leg-fol-mn-cafe', codigo: 'LEG-MN-CAFE',
    nome: 'MN foliar — Café',
    parametroId: idDe('MN-FOL'), cultura: 'CAFE', fonte: 'Boletim Técnico 100, IAC, 2022',
    padrao: false, ativa: true,
    faixas: [
      { ate: 50, rotulo: 'Baixo', severidade: 'critico' },
      { de: 50, ate: 200, rotulo: 'Adequado', severidade: 'ideal' },
      { de: 200, rotulo: 'Alto', severidade: 'atencao' },
    ],
  },
  {
    id: 'leg-fol-zn-cafe', codigo: 'LEG-ZN-CAFE',
    nome: 'ZN foliar — Café',
    parametroId: idDe('ZN-FOL'), cultura: 'CAFE', fonte: 'Boletim Técnico 100, IAC, 2022',
    padrao: false, ativa: true,
    faixas: [
      { ate: 20, rotulo: 'Baixo', severidade: 'critico' },
      { de: 20, ate: 40, rotulo: 'Adequado', severidade: 'ideal' },
      { de: 40, rotulo: 'Alto', severidade: 'atencao' },
    ],
  },
  {
    id: 'leg-fol-n-soja', codigo: 'LEG-N-SOJA',
    nome: 'N foliar — Soja',
    parametroId: idDe('N-FOL'), cultura: 'SOJA', fonte: 'Embrapa Soja — tecnologias de produção',
    padrao: false, ativa: true,
    faixas: [
      { ate: 39, rotulo: 'Baixo', severidade: 'critico' },
      { de: 39, ate: 54, rotulo: 'Adequado', severidade: 'ideal' },
      { de: 54, rotulo: 'Alto', severidade: 'atencao' },
    ],
  },
  {
    id: 'leg-fol-p-soja', codigo: 'LEG-P-SOJA',
    nome: 'P foliar — Soja',
    parametroId: idDe('P-FOL'), cultura: 'SOJA', fonte: 'Embrapa Soja — tecnologias de produção',
    padrao: false, ativa: true,
    faixas: [
      { ate: 2.5, rotulo: 'Baixo', severidade: 'critico' },
      { de: 2.5, ate: 5, rotulo: 'Adequado', severidade: 'ideal' },
      { de: 5, rotulo: 'Alto', severidade: 'atencao' },
    ],
  },
  {
    id: 'leg-fol-k-soja', codigo: 'LEG-K-SOJA',
    nome: 'K foliar — Soja',
    parametroId: idDe('K-FOL'), cultura: 'SOJA', fonte: 'Embrapa Soja — tecnologias de produção',
    padrao: false, ativa: true,
    faixas: [
      { ate: 17, rotulo: 'Baixo', severidade: 'critico' },
      { de: 17, ate: 25, rotulo: 'Adequado', severidade: 'ideal' },
      { de: 25, rotulo: 'Alto', severidade: 'atencao' },
    ],
  },
  {
    id: 'leg-fol-ca-soja', codigo: 'LEG-CA-SOJA',
    nome: 'CA foliar — Soja',
    parametroId: idDe('CA-FOL'), cultura: 'SOJA', fonte: 'Embrapa Soja — tecnologias de produção',
    padrao: false, ativa: true,
    faixas: [
      { ate: 4, rotulo: 'Baixo', severidade: 'critico' },
      { de: 4, ate: 20, rotulo: 'Adequado', severidade: 'ideal' },
      { de: 20, rotulo: 'Alto', severidade: 'atencao' },
    ],
  },
  {
    id: 'leg-fol-mg-soja', codigo: 'LEG-MG-SOJA',
    nome: 'MG foliar — Soja',
    parametroId: idDe('MG-FOL'), cultura: 'SOJA', fonte: 'Embrapa Soja — tecnologias de produção',
    padrao: false, ativa: true,
    faixas: [
      { ate: 3, rotulo: 'Baixo', severidade: 'critico' },
      { de: 3, ate: 10, rotulo: 'Adequado', severidade: 'ideal' },
      { de: 10, rotulo: 'Alto', severidade: 'atencao' },
    ],
  },
  {
    id: 'leg-fol-s-soja', codigo: 'LEG-S-SOJA',
    nome: 'S foliar — Soja',
    parametroId: idDe('S-FOL'), cultura: 'SOJA', fonte: 'Embrapa Soja — tecnologias de produção',
    padrao: false, ativa: true,
    faixas: [
      { ate: 2.1, rotulo: 'Baixo', severidade: 'critico' },
      { de: 2.1, ate: 4, rotulo: 'Adequado', severidade: 'ideal' },
      { de: 4, rotulo: 'Alto', severidade: 'atencao' },
    ],
  },
  {
    id: 'leg-fol-b-soja', codigo: 'LEG-B-SOJA',
    nome: 'B foliar — Soja',
    parametroId: idDe('B-FOL'), cultura: 'SOJA', fonte: 'Embrapa Soja — tecnologias de produção',
    padrao: false, ativa: true,
    faixas: [
      { ate: 21, rotulo: 'Baixo', severidade: 'critico' },
      { de: 21, ate: 55, rotulo: 'Adequado', severidade: 'ideal' },
      { de: 55, rotulo: 'Alto', severidade: 'atencao' },
    ],
  },
  {
    id: 'leg-fol-cu-soja', codigo: 'LEG-CU-SOJA',
    nome: 'CU foliar — Soja',
    parametroId: idDe('CU-FOL'), cultura: 'SOJA', fonte: 'Embrapa Soja — tecnologias de produção',
    padrao: false, ativa: true,
    faixas: [
      { ate: 10, rotulo: 'Baixo', severidade: 'critico' },
      { de: 10, ate: 30, rotulo: 'Adequado', severidade: 'ideal' },
      { de: 30, rotulo: 'Alto', severidade: 'atencao' },
    ],
  },
  {
    id: 'leg-fol-fe-soja', codigo: 'LEG-FE-SOJA',
    nome: 'FE foliar — Soja',
    parametroId: idDe('FE-FOL'), cultura: 'SOJA', fonte: 'Embrapa Soja — tecnologias de produção',
    padrao: false, ativa: true,
    faixas: [
      { ate: 50, rotulo: 'Baixo', severidade: 'critico' },
      { de: 50, ate: 350, rotulo: 'Adequado', severidade: 'ideal' },
      { de: 350, rotulo: 'Alto', severidade: 'atencao' },
    ],
  },
  {
    id: 'leg-fol-mn-soja', codigo: 'LEG-MN-SOJA',
    nome: 'MN foliar — Soja',
    parametroId: idDe('MN-FOL'), cultura: 'SOJA', fonte: 'Embrapa Soja — tecnologias de produção',
    padrao: false, ativa: true,
    faixas: [
      { ate: 20, rotulo: 'Baixo', severidade: 'critico' },
      { de: 20, ate: 100, rotulo: 'Adequado', severidade: 'ideal' },
      { de: 100, rotulo: 'Alto', severidade: 'atencao' },
    ],
  },
  {
    id: 'leg-fol-zn-soja', codigo: 'LEG-ZN-SOJA',
    nome: 'ZN foliar — Soja',
    parametroId: idDe('ZN-FOL'), cultura: 'SOJA', fonte: 'Embrapa Soja — tecnologias de produção',
    padrao: false, ativa: true,
    faixas: [
      { ate: 20, rotulo: 'Baixo', severidade: 'critico' },
      { de: 20, ate: 50, rotulo: 'Adequado', severidade: 'ideal' },
      { de: 50, rotulo: 'Alto', severidade: 'atencao' },
    ],
  },
  {
    id: 'leg-fol-n-laranja', codigo: 'LEG-N-LARANJA',
    nome: 'N foliar — Laranja',
    parametroId: idDe('N-FOL'), cultura: 'LARANJA', fonte: 'Boletim Técnico 100, IAC, 2022',
    padrao: false, ativa: true,
    faixas: [
      { ate: 25, rotulo: 'Baixo', severidade: 'critico' },
      { de: 25, ate: 30, rotulo: 'Adequado', severidade: 'ideal' },
      { de: 30, rotulo: 'Alto', severidade: 'atencao' },
    ],
  },
  {
    id: 'leg-fol-p-laranja', codigo: 'LEG-P-LARANJA',
    nome: 'P foliar — Laranja',
    parametroId: idDe('P-FOL'), cultura: 'LARANJA', fonte: 'Boletim Técnico 100, IAC, 2022',
    padrao: false, ativa: true,
    faixas: [
      { ate: 1.2, rotulo: 'Baixo', severidade: 'critico' },
      { de: 1.2, ate: 1.6, rotulo: 'Adequado', severidade: 'ideal' },
      { de: 1.6, rotulo: 'Alto', severidade: 'atencao' },
    ],
  },
  {
    id: 'leg-fol-k-laranja', codigo: 'LEG-K-LARANJA',
    nome: 'K foliar — Laranja',
    parametroId: idDe('K-FOL'), cultura: 'LARANJA', fonte: 'Boletim Técnico 100, IAC, 2022',
    padrao: false, ativa: true,
    faixas: [
      { ate: 10, rotulo: 'Baixo', severidade: 'critico' },
      { de: 10, ate: 15, rotulo: 'Adequado', severidade: 'ideal' },
      { de: 15, rotulo: 'Alto', severidade: 'atencao' },
    ],
  },
  {
    id: 'leg-fol-ca-laranja', codigo: 'LEG-CA-LARANJA',
    nome: 'CA foliar — Laranja',
    parametroId: idDe('CA-FOL'), cultura: 'LARANJA', fonte: 'Boletim Técnico 100, IAC, 2022',
    padrao: false, ativa: true,
    faixas: [
      { ate: 35, rotulo: 'Baixo', severidade: 'critico' },
      { de: 35, ate: 50, rotulo: 'Adequado', severidade: 'ideal' },
      { de: 50, rotulo: 'Alto', severidade: 'atencao' },
    ],
  },
  {
    id: 'leg-fol-mg-laranja', codigo: 'LEG-MG-LARANJA',
    nome: 'MG foliar — Laranja',
    parametroId: idDe('MG-FOL'), cultura: 'LARANJA', fonte: 'Boletim Técnico 100, IAC, 2022',
    padrao: false, ativa: true,
    faixas: [
      { ate: 3.5, rotulo: 'Baixo', severidade: 'critico' },
      { de: 3.5, ate: 5, rotulo: 'Adequado', severidade: 'ideal' },
      { de: 5, rotulo: 'Alto', severidade: 'atencao' },
    ],
  },
  {
    id: 'leg-fol-s-laranja', codigo: 'LEG-S-LARANJA',
    nome: 'S foliar — Laranja',
    parametroId: idDe('S-FOL'), cultura: 'LARANJA', fonte: 'Boletim Técnico 100, IAC, 2022',
    padrao: false, ativa: true,
    faixas: [
      { ate: 2, rotulo: 'Baixo', severidade: 'critico' },
      { de: 2, ate: 3, rotulo: 'Adequado', severidade: 'ideal' },
      { de: 3, rotulo: 'Alto', severidade: 'atencao' },
    ],
  },
  {
    id: 'leg-fol-b-laranja', codigo: 'LEG-B-LARANJA',
    nome: 'B foliar — Laranja',
    parametroId: idDe('B-FOL'), cultura: 'LARANJA', fonte: 'Boletim Técnico 100, IAC, 2022',
    padrao: false, ativa: true,
    faixas: [
      { ate: 50, rotulo: 'Baixo', severidade: 'critico' },
      { de: 50, ate: 150, rotulo: 'Adequado', severidade: 'ideal' },
      { de: 150, rotulo: 'Alto', severidade: 'atencao' },
    ],
  },
  {
    id: 'leg-fol-cu-laranja', codigo: 'LEG-CU-LARANJA',
    nome: 'CU foliar — Laranja',
    parametroId: idDe('CU-FOL'), cultura: 'LARANJA', fonte: 'Boletim Técnico 100, IAC, 2022',
    padrao: false, ativa: true,
    faixas: [
      { ate: 10, rotulo: 'Baixo', severidade: 'critico' },
      { de: 10, ate: 20, rotulo: 'Adequado', severidade: 'ideal' },
      { de: 20, rotulo: 'Alto', severidade: 'atencao' },
    ],
  },
  {
    id: 'leg-fol-fe-laranja', codigo: 'LEG-FE-LARANJA',
    nome: 'FE foliar — Laranja',
    parametroId: idDe('FE-FOL'), cultura: 'LARANJA', fonte: 'Boletim Técnico 100, IAC, 2022',
    padrao: false, ativa: true,
    faixas: [
      { ate: 50, rotulo: 'Baixo', severidade: 'critico' },
      { de: 50, ate: 150, rotulo: 'Adequado', severidade: 'ideal' },
      { de: 150, rotulo: 'Alto', severidade: 'atencao' },
    ],
  },
  {
    id: 'leg-fol-mn-laranja', codigo: 'LEG-MN-LARANJA',
    nome: 'MN foliar — Laranja',
    parametroId: idDe('MN-FOL'), cultura: 'LARANJA', fonte: 'Boletim Técnico 100, IAC, 2022',
    padrao: false, ativa: true,
    faixas: [
      { ate: 30, rotulo: 'Baixo', severidade: 'critico' },
      { de: 30, ate: 60, rotulo: 'Adequado', severidade: 'ideal' },
      { de: 60, rotulo: 'Alto', severidade: 'atencao' },
    ],
  },
  {
    id: 'leg-fol-zn-laranja', codigo: 'LEG-ZN-LARANJA',
    nome: 'ZN foliar — Laranja',
    parametroId: idDe('ZN-FOL'), cultura: 'LARANJA', fonte: 'Boletim Técnico 100, IAC, 2022',
    padrao: false, ativa: true,
    faixas: [
      { ate: 35, rotulo: 'Baixo', severidade: 'critico' },
      { de: 35, ate: 70, rotulo: 'Adequado', severidade: 'ideal' },
      { de: 70, rotulo: 'Alto', severidade: 'atencao' },
    ],
  },
];


/* ---------------- Cadastros simples ---------------- */

/* Os códigos POP são a numeração sugerida; cada laboratório
   renomeia para a sua. A norma e a versão é que não se inventam. */
export const metodologias: Metodologia[] = [
  { id: 'met-01', codigo: 'POP-ACI-004', nome: 'Potenciometria em suspensão de solo', norma: 'Embrapa 2017', versao: '4.2', vigenteDesde: '2017-01-01', ativa: true },
  { id: 'met-02', codigo: 'POP-ACI-007', nome: 'pH em CaCl₂ 0,01 mol/L', norma: 'IAC Boletim 100', versao: '2.1', vigenteDesde: '2022-01-01', ativa: true },
  { id: 'met-03', codigo: 'POP-FER-011', nome: 'Fósforo por Mehlich-1 e colorimetria', norma: 'Embrapa 2017', versao: '3.0', vigenteDesde: '2017-01-01', ativa: true },
  { id: 'met-04', codigo: 'POP-FER-014', nome: 'Potássio por fotometria de chama', norma: 'Embrapa 2017', versao: '2.4', vigenteDesde: '2017-01-01', ativa: true },
  { id: 'met-05', codigo: 'POP-ORG-002', nome: 'Matéria orgânica por Walkley-Black', norma: 'Embrapa 2017', versao: '1.8', vigenteDesde: '2017-01-01', ativa: true },
  { id: 'met-06', codigo: 'POP-AGU-021', nome: 'pH em água e efluente', norma: 'SMEWW 4500-H⁺ B', versao: '23ª ed.', vigenteDesde: '2017-01-01', ativa: true },
  { id: 'met-07', codigo: 'POP-COR-005', nome: 'PRNT de corretivos', norma: 'IN SDA 05/2007', versao: '2.0', vigenteDesde: '2007-02-23', ativa: true },
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


export const observacoesFixas: ItemSimples[] = [
  { id: 'obs-01', codigo: 'OBS-AMOSTRAGEM', nome: 'Os resultados referem-se exclusivamente às amostras recebidas e identificadas neste documento.', ativo: true },
  { id: 'obs-02', codigo: 'OBS-REPRODUCAO', nome: 'A reprodução parcial deste laudo só é permitida com autorização escrita do laboratório.', ativo: true },
  { id: 'obs-03', codigo: 'OBS-COLETA', nome: 'A coleta foi realizada pelo cliente; o laboratório não se responsabiliza pela representatividade da amostra.', ativo: true },
  { id: 'obs-04', codigo: 'OBS-SUBCONTRATADO', nome: 'Ensaio subcontratado a laboratório parceiro, identificado no corpo do laudo.', ativo: true },
  { id: 'obs-05', codigo: 'OBS-FORA-ESCOPO', nome: 'Ensaio fora do escopo de acreditação.', ativo: true },
  { id: 'obs-06', codigo: 'OBS-DIGESTAO', nome: 'N — Digestão Sulfúrica; P, K, Ca, Mg, S, Cu, Fe, Mn, Zn, Na, Al e Ni — Digestão Nítrico-perclórica; B, Co e Mo — Incineração.', ativo: true },
  { id: 'obs-07', codigo: 'OBS-JURIDICO', nome: 'Este laudo não tem fins jurídicos.', ativo: true },
  { id: 'obs-08', codigo: 'OBS-DESCARTE', nome: 'Após 90 dias todas as amostras serão descartadas.', ativo: true },
  { id: 'obs-09', codigo: 'OBS-IDENTIFICACAO', nome: 'A identificação da amostra é de exclusiva responsabilidade do remetente.', ativo: true },
];

/* ---------------- Recomendação agronômica ---------------- */

/**
 * As tabelas de referência que o laboratório oferece.
 *
 * Os valores abaixo são os publicados, como circulam nas quatro
 * referências mais usadas no país. Eles existem aqui para que o
 * sistema chegue utilizável — não como verdade cravada: o cadastro
 * é editável justamente porque cada laboratório confere contra a
 * publicação que atende sua região e ajusta o que seu agrônomo
 * assina. É ele quem responde pela recomendação, não o software.
 */

export const tabelasRecomendacao: TabelaRecomendacao[] = [
  {
    id: 'trc-cfsemg', codigo: 'CFSEMG-5A', nome: '5ª Aproximação — CFSEMG',
    regiao: 'MG', fonte: 'CFSEMG — Recomendações para o uso de corretivos e fertilizantes em Minas Gerais, 5ª Aproximação (1999)',
    metodoCalagem: 'saturacao-bases', profundidadeIncorporacao: 20,
    padrao: true, ativa: true,
  },
  {
    id: 'trc-iac', codigo: 'IAC-100', nome: 'Boletim 100 — IAC',
    regiao: 'SP', fonte: 'IAC — Boletim Técnico 100: Recomendações de adubação e calagem para o Estado de São Paulo',
    metodoCalagem: 'saturacao-bases', profundidadeIncorporacao: 20,
    padrao: false, ativa: true,
  },
  {
    id: 'trc-cerrado', codigo: 'CERRADO-AL', nome: 'Neutralização do alumínio — Cerrado',
    regiao: 'Cerrado', fonte: 'Embrapa Cerrados — Cerrado: correção do solo e adubação',
    metodoCalagem: 'neutralizacao-al', profundidadeIncorporacao: 20,
    padrao: false, ativa: true,
  },
  {
    /* A curva do Sul é tabelada, não tem equação: a dose se lê no
       índice SMP. Os pontos abaixo são a tabela abreviada — o
       módulo interpola entre eles, que é como a publicação manda
       tratar índice intermediário. */
    id: 'trc-sul', codigo: 'CQFS-RS-SC', nome: 'Curva SMP — CQFS-RS/SC',
    regiao: 'RS/SC', fonte: 'CQFS-RS/SC — Manual de calagem e adubação para os Estados do Rio Grande do Sul e de Santa Catarina',
    metodoCalagem: 'smp', profundidadeIncorporacao: 20,
    padrao: false, ativa: true,
    pontosSmp: [
      { indice: 4.4, ph55: 15.0, ph60: 21.0, ph65: 29.0 },
      { indice: 4.6, ph55: 11.9, ph60: 16.0, ph65: 21.0 },
      { indice: 4.8, ph55: 9.5, ph60: 12.8, ph65: 16.2 },
      { indice: 5.0, ph55: 7.7, ph60: 10.1, ph65: 12.5 },
      { indice: 5.2, ph55: 6.2, ph60: 8.0, ph65: 9.7 },
      { indice: 5.4, ph55: 5.1, ph60: 6.3, ph65: 7.6 },
      { indice: 5.6, ph55: 4.1, ph60: 5.0, ph65: 5.8 },
      { indice: 5.8, ph55: 3.3, ph60: 3.9, ph65: 4.5 },
      { indice: 6.0, ph55: 2.7, ph60: 3.0, ph65: 3.4 },
      { indice: 6.2, ph55: 2.1, ph60: 2.3, ph65: 2.6 },
      { indice: 6.4, ph55: 1.6, ph60: 1.8, ph65: 2.0 },
      { indice: 6.6, ph55: 1.2, ph60: 1.3, ph65: 1.5 },
      { indice: 6.8, ph55: 0.8, ph60: 0.9, ph65: 1.0 },
      { indice: 7.0, ph55: 0.5, ph60: 0.6, ph65: 0.6 },
      { indice: 7.2, ph55: 0.0, ph60: 0.0, ph65: 0.0 },
    ],
  },
];

/* As classes de teor que mais se repetem, para não reescrever a
   mesma escada em cada cultura. A dose é que muda por cultura. */
function classesFosforo(doses: [number, number, number, number, number]): DosePorClasse[] {
  return [
    { ate: 6, dose: doses[0], classe: 'Muito baixo' },
    { de: 6, ate: 12, dose: doses[1], classe: 'Baixo' },
    { de: 12, ate: 20, dose: doses[2], classe: 'Médio' },
    { de: 20, ate: 30, dose: doses[3], classe: 'Bom' },
    { de: 30, dose: doses[4], classe: 'Muito bom' },
  ];
}

function classesPotassio(doses: [number, number, number, number, number]): DosePorClasse[] {
  return [
    { ate: 25, dose: doses[0], classe: 'Muito baixo' },
    { de: 25, ate: 50, dose: doses[1], classe: 'Baixo' },
    { de: 50, ate: 80, dose: doses[2], classe: 'Médio' },
    { de: 80, ate: 120, dose: doses[3], classe: 'Bom' },
    { de: 120, dose: doses[4], classe: 'Muito bom' },
  ];
}

export const recomendacoesCultura: RecomendacaoCultura[] = [
  /* ---- CFSEMG (MG) — método da saturação por bases ---- */
  {
    id: 'rcl-mg-soja', tabelaId: 'trc-cfsemg', cultura: 'SOJA',
    saturacaoDesejada: 60,
    produtividadeReferencia: 60, unidadeProdutividade: 'sc/ha',
    nitrogenio: 0,
    fosforo: classesFosforo([120, 90, 60, 40, 20]),
    potassio: classesPotassio([100, 80, 60, 40, 20]),
    observacao: 'N dispensado: a fixação biológica supre a cultura inoculada.',
    ativa: true,
  },
  {
    id: 'rcl-mg-milho', tabelaId: 'trc-cfsemg', cultura: 'MILHO2',
    saturacaoDesejada: 60,
    produtividadeReferencia: 8, unidadeProdutividade: 't/ha',
    nitrogenio: 120,
    fosforo: classesFosforo([140, 100, 70, 50, 30]),
    potassio: classesPotassio([120, 90, 70, 50, 30]),
    observacao: 'N em plantio e cobertura, parcelado.',
    ativa: true,
  },
  {
    id: 'rcl-mg-algodao', tabelaId: 'trc-cfsemg', cultura: 'ALGODAO',
    saturacaoDesejada: 70,
    produtividadeReferencia: 4, unidadeProdutividade: 't/ha',
    nitrogenio: 140,
    fosforo: classesFosforo([150, 110, 80, 60, 40]),
    potassio: classesPotassio([140, 110, 80, 60, 40]),
    ativa: true,
  },
  {
    id: 'rcl-mg-cana', tabelaId: 'trc-cfsemg', cultura: 'CANA',
    saturacaoDesejada: 60,
    produtividadeReferencia: 90, unidadeProdutividade: 't/ha',
    nitrogenio: 60,
    fosforo: classesFosforo([150, 120, 90, 60, 30]),
    potassio: classesPotassio([150, 120, 90, 60, 30]),
    observacao: 'Dose de cana-planta; a soca pede mais N.',
    ativa: true,
  },
  {
    id: 'rcl-mg-cafe', tabelaId: 'trc-cfsemg', cultura: 'CAFE',
    saturacaoDesejada: 60,
    produtividadeReferencia: 30, unidadeProdutividade: 'sc/ha',
    nitrogenio: 300,
    fosforo: classesFosforo([80, 60, 40, 30, 20]),
    potassio: classesPotassio([200, 160, 120, 90, 60]),
    observacao: 'Lavoura em produção, parcelado ao longo das águas.',
    ativa: true,
  },
  {
    id: 'rcl-mg-pasto', tabelaId: 'trc-cfsemg', cultura: 'PASTO',
    saturacaoDesejada: 50,
    produtividadeReferencia: 10, unidadeProdutividade: 't/ha',
    nitrogenio: 50,
    fosforo: classesFosforo([80, 60, 40, 25, 0]),
    potassio: classesPotassio([80, 60, 40, 20, 0]),
    observacao: 'Pastagem de braquiária em formação; V% menor que o de grão.',
    ativa: true,
  },
  {
    id: 'rcl-mg-feijao', tabelaId: 'trc-cfsemg', cultura: 'FEIJAO',
    saturacaoDesejada: 60,
    produtividadeReferencia: 2.5, unidadeProdutividade: 't/ha',
    nitrogenio: 80,
    fosforo: classesFosforo([120, 90, 60, 40, 20]),
    potassio: classesPotassio([100, 80, 60, 40, 20]),
    ativa: true,
  },
  {
    id: 'rcl-mg-sorgo', tabelaId: 'trc-cfsemg', cultura: 'SORGO',
    saturacaoDesejada: 60,
    produtividadeReferencia: 5, unidadeProdutividade: 't/ha',
    nitrogenio: 90,
    fosforo: classesFosforo([110, 80, 60, 40, 20]),
    potassio: classesPotassio([100, 80, 60, 40, 20]),
    ativa: true,
  },

  /* ---- Boletim 100 (SP) — mesmo método, alvos mais altos ---- */
  {
    id: 'rcl-sp-soja', tabelaId: 'trc-iac', cultura: 'SOJA',
    saturacaoDesejada: 70,
    produtividadeReferencia: 60, unidadeProdutividade: 'sc/ha',
    nitrogenio: 0,
    fosforo: classesFosforo([120, 90, 60, 40, 20]),
    potassio: classesPotassio([100, 80, 60, 40, 20]),
    ativa: true,
  },
  {
    id: 'rcl-sp-cana', tabelaId: 'trc-iac', cultura: 'CANA',
    saturacaoDesejada: 60,
    produtividadeReferencia: 100, unidadeProdutividade: 't/ha',
    nitrogenio: 60,
    fosforo: classesFosforo([150, 120, 90, 60, 30]),
    potassio: classesPotassio([150, 120, 90, 60, 30]),
    ativa: true,
  },
  {
    id: 'rcl-sp-cafe', tabelaId: 'trc-iac', cultura: 'CAFE',
    saturacaoDesejada: 70,
    produtividadeReferencia: 30, unidadeProdutividade: 'sc/ha',
    nitrogenio: 300,
    fosforo: classesFosforo([80, 60, 40, 30, 20]),
    potassio: classesPotassio([200, 160, 120, 90, 60]),
    ativa: true,
  },
  {
    id: 'rcl-sp-milho', tabelaId: 'trc-iac', cultura: 'MILHO2',
    saturacaoDesejada: 70,
    produtividadeReferencia: 8, unidadeProdutividade: 't/ha',
    nitrogenio: 120,
    fosforo: classesFosforo([140, 100, 70, 50, 30]),
    potassio: classesPotassio([120, 90, 70, 50, 30]),
    ativa: true,
  },

  /* ---- Cerrado — neutralização do alumínio ----
     O coeficiente do Al cresce com a argila: solo arenoso tampona
     menos e precisa de menos calcário por unidade de Al³⁺. */
  {
    id: 'rcl-cer-soja', tabelaId: 'trc-cerrado', cultura: 'SOJA',
    fatorAluminio: 2, caMgDesejado: 2,
    produtividadeReferencia: 60, unidadeProdutividade: 'sc/ha',
    nitrogenio: 0,
    fosforo: classesFosforo([140, 100, 70, 45, 25]),
    potassio: classesPotassio([110, 85, 65, 45, 25]),
    observacao: 'Coeficiente 2 para solo de textura média; argilosos usam 3.',
    ativa: true,
  },
  {
    id: 'rcl-cer-milho', tabelaId: 'trc-cerrado', cultura: 'MILHO2',
    fatorAluminio: 2, caMgDesejado: 2,
    produtividadeReferencia: 8, unidadeProdutividade: 't/ha',
    nitrogenio: 120,
    fosforo: classesFosforo([150, 110, 80, 55, 30]),
    potassio: classesPotassio([130, 100, 75, 55, 30]),
    ativa: true,
  },
  {
    id: 'rcl-cer-algodao', tabelaId: 'trc-cerrado', cultura: 'ALGODAO',
    fatorAluminio: 3, caMgDesejado: 2.5,
    produtividadeReferencia: 4, unidadeProdutividade: 't/ha',
    nitrogenio: 140,
    fosforo: classesFosforo([160, 120, 85, 60, 40]),
    potassio: classesPotassio([150, 115, 85, 60, 40]),
    observacao: 'Algodão é exigente em Ca; coeficiente 3 e Ca+Mg maior.',
    ativa: true,
  },

  /* ---- Sul — curva SMP ---- */
  {
    id: 'rcl-sul-soja', tabelaId: 'trc-sul', cultura: 'SOJA',
    phAlvo: 6.0,
    produtividadeReferencia: 60, unidadeProdutividade: 'sc/ha',
    nitrogenio: 0,
    fosforo: classesFosforo([120, 90, 60, 40, 20]),
    potassio: classesPotassio([100, 80, 60, 40, 20]),
    ativa: true,
  },
  {
    id: 'rcl-sul-milho', tabelaId: 'trc-sul', cultura: 'MILHO2',
    phAlvo: 6.0,
    produtividadeReferencia: 8, unidadeProdutividade: 't/ha',
    nitrogenio: 120,
    fosforo: classesFosforo([140, 100, 70, 50, 30]),
    potassio: classesPotassio([120, 90, 70, 50, 30]),
    ativa: true,
  },
  {
    id: 'rcl-sul-feijao', tabelaId: 'trc-sul', cultura: 'FEIJAO',
    phAlvo: 5.5,
    produtividadeReferencia: 2.5, unidadeProdutividade: 't/ha',
    nitrogenio: 80,
    fosforo: classesFosforo([120, 90, 60, 40, 20]),
    potassio: classesPotassio([100, 80, 60, 40, 20]),
    ativa: true,
  },
];

/* ---------------- Ensaio de proficiência ---------------- */


export const programasProficiencia: ProgramaProficiencia[] = [
  {
    id: 'pgp-paqlf', codigo: 'PAQLF',
    nome: 'Programa de Análise de Qualidade de Laboratórios de Fertilidade',
    organizador: 'Embrapa Solos', grupoId: 'solo', rodadasPorAno: 2, ativo: true,
    observacao: 'Rodadas semestrais; amostras de solo de diferentes regiões.',
  },
  {
    id: 'pgp-iac', codigo: 'IAC-PROFIC',
    nome: 'Ensaio de proficiência em análise de solo',
    organizador: 'Instituto Agronômico de Campinas', grupoId: 'solo',
    rodadasPorAno: 2, ativo: true,
  },
  {
    id: 'pgp-folha', codigo: 'PIF-FOLIAR',
    nome: 'Programa interlaboratorial de tecido vegetal',
    organizador: 'ESALQ/USP', grupoId: 'foliar', rodadasPorAno: 2, ativo: true,
  },
  {
    id: 'pgp-fert', codigo: 'RBLE-FERT',
    nome: 'Ensaio de proficiência em fertilizantes minerais',
    organizador: 'MAPA / RBLE', grupoId: 'fertilizantes', rodadasPorAno: 1, ativo: false,
    observacao: 'Participação suspensa na safra 25/26 — retomar em 2027.',
  },
];


/* ============================================================
   BANCADA — apuração fiscal de serviços laboratoriais
   Análise laboratorial é serviço: a saída normal é NFS-e
   municipal (ISS) com as retenções federais aplicáveis.

   ATENÇÃO: alíquotas, limites de dispensa e códigos de serviço
   mudam por município e por exercício. Os valores abaixo ficam
   centralizados em PARAMETROS_FISCAIS justamente para serem
   revisados pela contabilidade a cada competência.
   ============================================================ */

export type RegimeTributario = 'simples' | 'presumido' | 'real';

export const PARAMETROS_FISCAIS = {
  /** Lei 10.833/2003, art. 31 §3º — dispensa da CSRF abaixo deste valor */
  limiteDispensaCsrf: 215.05,
  /** Dispensa de retenção de IRRF quando o imposto apurado não supera este valor */
  limiteDispensaIrrf: 10.0,
  /** CSRF = CSLL 1% + PIS 0,65% + COFINS 3% */
  aliquotaCsll: 1.0,
  aliquotaPis: 0.65,
  aliquotaCofins: 3.0,
  /** IRRF sobre serviços profissionais — RIR/2018, art. 714 */
  aliquotaIrrf: 1.5,
  /** INSS sobre cessão de mão de obra — não se aplica a ensaio laboratorial comum */
  aliquotaInss: 11.0,
} as const;

/**
 * Códigos da lista anexa à LC 116/2003 que cobrem laboratório.
 * O município pode exigir um código próprio equivalente.
 */
export const CODIGOS_SERVICO = [
  { codigo: '17.01', descricao: 'Assessoria, consultoria, análise e congêneres', aliquotaSugerida: 5 },
  { codigo: '17.09', descricao: 'Perícias, laudos, exames técnicos e análises técnicas', aliquotaSugerida: 3 },
  { codigo: '04.02', descricao: 'Análises clínicas, patologia, eletricidade médica', aliquotaSugerida: 2 },
  { codigo: '21.01', descricao: 'Serviços de registros públicos, cartorários e notariais', aliquotaSugerida: 5 },
] as const;

export interface EntradaApuracao {
  valorServicos: number;
  deducoes?: number;
  aliquotaIss: number;
  /** ISS retido na fonte pelo tomador */
  issRetido: boolean;
  regime: RegimeTributario;
  /** retenções federais só incidem quando o tomador é pessoa jurídica */
  tomadorPessoaJuridica: boolean;
  /** cessão de mão de obra — habilita a retenção previdenciária */
  cessaoMaoDeObra?: boolean;
}

export interface Apuracao {
  baseCalculo: number;
  valorIss: number;
  valorIr: number;
  valorPis: number;
  valorCofins: number;
  valorCsll: number;
  valorInss: number;
  totalRetencoes: number;
  valorLiquido: number;
  notas: string[];
}

function arred(v: number): number {
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

/**
 * Apura ISS e retenções federais de uma NFS-e de análise laboratorial.
 */
export function apurarNotaServico(e: EntradaApuracao): Apuracao {
  const P = PARAMETROS_FISCAIS;
  const notas: string[] = [];

  const deducoes = e.deducoes ?? 0;
  const baseCalculo = Math.max(0, e.valorServicos - deducoes);
  const valorIss = arred((baseCalculo * e.aliquotaIss) / 100);

  let valorIr = 0, valorPis = 0, valorCofins = 0, valorCsll = 0, valorInss = 0;

  if (!e.tomadorPessoaJuridica) {
    notas.push('Tomador pessoa física: não há retenção federal na fonte.');
  } else if (e.regime === 'simples') {
    notas.push('Optante do Simples Nacional: dispensado das retenções de IR, PIS, COFINS e CSLL (LC 123/2006, art. 13 §1º).');
  } else {
    // CSRF — PIS + COFINS + CSLL
    if (e.valorServicos > P.limiteDispensaCsrf) {
      valorPis = arred((e.valorServicos * P.aliquotaPis) / 100);
      valorCofins = arred((e.valorServicos * P.aliquotaCofins) / 100);
      valorCsll = arred((e.valorServicos * P.aliquotaCsll) / 100);
    } else {
      notas.push(`Nota de ${e.valorServicos.toFixed(2)}: abaixo do limite de dispensa da CSRF (R$ ${P.limiteDispensaCsrf.toFixed(2)}).`);
    }

    // IRRF sobre serviços profissionais
    const irApurado = arred((e.valorServicos * P.aliquotaIrrf) / 100);
    if (irApurado > P.limiteDispensaIrrf) {
      valorIr = irApurado;
    } else {
      notas.push(`IRRF apurado de R$ ${irApurado.toFixed(2)} dispensado por não superar R$ ${P.limiteDispensaIrrf.toFixed(2)}.`);
    }

    if (e.cessaoMaoDeObra) {
      valorInss = arred((e.valorServicos * P.aliquotaInss) / 100);
      notas.push('Retenção previdenciária de 11% aplicada por cessão de mão de obra.');
    }
  }

  if (e.issRetido) {
    notas.push('ISS retido na fonte pelo tomador — recolhimento de responsabilidade do contratante.');
  }

  const totalRetencoes = arred(
    valorIr + valorPis + valorCofins + valorCsll + valorInss + (e.issRetido ? valorIss : 0),
  );

  return {
    baseCalculo: arred(baseCalculo),
    valorIss, valorIr, valorPis, valorCofins, valorCsll, valorInss,
    totalRetencoes,
    valorLiquido: arred(e.valorServicos - totalRetencoes),
    notas,
  };
}

/* ---------------- Chave de acesso ---------------- */

/**
 * Dígito verificador da chave de acesso pelo módulo 11
 * com pesos cíclicos de 2 a 9 (MOC da NF-e).
 */
export function digitoChaveAcesso(chave43: string): number {
  let soma = 0;
  let peso = 2;
  for (let i = chave43.length - 1; i >= 0; i--) {
    soma += Number(chave43[i]) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const resto = soma % 11;
  return resto === 0 || resto === 1 ? 0 : 11 - resto;
}

export function formatarChaveAcesso(chave: string): string {
  return (chave.match(/.{1,4}/g) ?? []).join(' ');
}

/* ---------------- Competência ---------------- */

export function competenciaAtual(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function rotuloCompetencia(competencia: string): string {
  const [ano, mes] = competencia.split('-').map(Number);
  if (!ano || !mes) return competencia;
  const nome = new Date(ano, mes - 1, 1)
    .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return nome.charAt(0).toUpperCase() + nome.slice(1);
}

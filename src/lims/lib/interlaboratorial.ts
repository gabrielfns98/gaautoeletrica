/* ============================================================
   BANCADA — ensaio de proficiência (interlaboratorial)

   O controle interno responde "o laboratório está estável?". Ele
   não responde "o laboratório está certo?" — uma bancada pode
   repetir o mesmo erro com desvio padrão exemplar durante anos, e
   a carta de Levey-Jennings fica impecável o tempo todo.

   Quem responde isso é o programa interlaboratorial: a mesma
   amostra vai para dezenas de laboratórios, e o valor designado
   sai do consenso. PAQLF (Embrapa), IAC e congêneres. A ISO/IEC
   17025 (7.7.2) exige participação, e a 17043/13528 define como
   se lê o resultado.

   O número que importa é o z-score. Ele não é "o erro": é o erro
   em unidades do desvio padrão que o programa considera aceitável
   para aquele ensaio — por isso 0,3 mg/dm³ de diferença pode ser
   excelente num ensaio e reprovação em outro.
   ============================================================ */

/* ---------------- Classificação ---------------- */

export type Desempenho = 'satisfatorio' | 'questionavel' | 'insatisfatorio';

export const ROTULO_DESEMPENHO: Record<Desempenho, string> = {
  satisfatorio: 'Satisfatório',
  questionavel: 'Questionável',
  insatisfatorio: 'Insatisfatório',
};

/**
 * Faixas da ISO 13528 / ISO/IEC 17043.
 *
 * `questionavel` é sinal de alerta, não reprovação: um z entre 2 e
 * 3 acontece por acaso em cerca de 4,5% das participações de um
 * laboratório perfeito. É a repetição que acusa, e é por isso que
 * `tendencia` existe mais abaixo.
 */
export function classificarZ(z: number): Desempenho {
  const a = Math.abs(z);
  if (!Number.isFinite(z)) return 'questionavel';
  if (a >= 3) return 'insatisfatorio';
  if (a > 2) return 'questionavel';
  return 'satisfatorio';
}

/* ---------------- Escores ---------------- */

export interface EntradaEscore {
  /** o que o laboratório relatou */
  valor: number;
  /** valor designado da rodada, do consenso dos participantes */
  designado: number;
  /** desvio padrão para avaliação da proficiência (σ) */
  desvioAlvo: number;
  /** incerteza padrão do valor designado (u_X), quando o programa informa */
  incertezaDesignado?: number;
  /** incerteza expandida do laboratório (U_lab), para o número En */
  incertezaLaboratorio?: number;
  /** incerteza expandida do valor designado (U_X), para o número En */
  incertezaExpandidaDesignado?: number;
}

export interface Escore {
  /** z = (x − X) / σ */
  z?: number;
  /**
   * z' = (x − X) / √(σ² + u_X²)
   *
   * Usado quando a incerteza do valor designado não é desprezível
   * diante de σ. Sem ele, um programa com poucos participantes
   * reprova laboratório por imprecisão da própria rodada.
   */
  zLinha?: number;
  /**
   * En = (x − X) / √(U_lab² + U_X²)
   *
   * O único escore que leva em conta a incerteza que o próprio
   * laboratório declara. |En| ≤ 1 é satisfatório.
   */
  en?: number;
  /** diferença relativa ao designado, em % — o que o analista lê primeiro */
  erroRelativo?: number;
  desempenho: Desempenho;
  /** o que faltou para calcular */
  faltando: string[];
}

const ok = (v: number | undefined): v is number => v !== undefined && Number.isFinite(v);

/**
 * Os escores de uma participação.
 *
 * O desempenho sai do z (ou do z', quando há incerteza do
 * designado). O En é informativo: ele avalia a declaração de
 * incerteza do laboratório, não o resultado, e um laboratório pode
 * ter z ruim e En bom simplesmente por declarar incerteza larga.
 */
export function calcularEscore(e: EntradaEscore): Escore {
  const faltando: string[] = [];
  if (!ok(e.valor)) faltando.push('resultado do laboratório');
  if (!ok(e.designado)) faltando.push('valor designado');
  if (!ok(e.desvioAlvo) || e.desvioAlvo <= 0) faltando.push('desvio padrão para avaliação');

  if (faltando.length > 0) return { desempenho: 'questionavel', faltando };

  const diferenca = e.valor - e.designado;
  const z = diferenca / e.desvioAlvo;

  const zLinha = ok(e.incertezaDesignado)
    ? diferenca / Math.sqrt(e.desvioAlvo ** 2 + e.incertezaDesignado ** 2)
    : undefined;

  const en = ok(e.incertezaLaboratorio) && ok(e.incertezaExpandidaDesignado)
    ? diferenca / Math.sqrt(e.incertezaLaboratorio ** 2 + e.incertezaExpandidaDesignado ** 2)
    : undefined;

  const erroRelativo = e.designado !== 0 ? (diferenca / e.designado) * 100 : undefined;

  return {
    z,
    zLinha,
    en,
    erroRelativo,
    // Havendo z', é ele que julga: já desconta a imprecisão da rodada.
    desempenho: classificarZ(zLinha ?? z),
    faltando: [],
  };
}

/** |En| ≤ 1 é satisfatório — a escala do En não é a do z. */
export function classificarEn(en: number): Desempenho {
  const a = Math.abs(en);
  if (!Number.isFinite(en)) return 'questionavel';
  if (a > 1.5) return 'insatisfatorio';
  if (a > 1) return 'questionavel';
  return 'satisfatorio';
}

/* ---------------- Desempenho da rodada ---------------- */

export interface ResumoRodada {
  total: number;
  satisfatorios: number;
  questionaveis: number;
  insatisfatorios: number;
  /** percentual de resultados satisfatórios */
  indice: number;
  /** maior |z| da rodada: é por ele que o laboratório começa a investigar */
  piorZ?: number;
  piorEnsaio?: string;
}

export interface ParticipacaoResumida {
  ensaio: string;
  z?: number;
  desempenho: Desempenho;
}

export function resumirRodada(itens: ParticipacaoResumida[]): ResumoRodada {
  const total = itens.length;
  const conta = (d: Desempenho) => itens.filter((i) => i.desempenho === d).length;

  let piorZ: number | undefined;
  let piorEnsaio: string | undefined;
  for (const i of itens) {
    if (i.z === undefined || !Number.isFinite(i.z)) continue;
    if (piorZ === undefined || Math.abs(i.z) > Math.abs(piorZ)) {
      piorZ = i.z;
      piorEnsaio = i.ensaio;
    }
  }

  const satisfatorios = conta('satisfatorio');
  return {
    total,
    satisfatorios,
    questionaveis: conta('questionavel'),
    insatisfatorios: conta('insatisfatorio'),
    indice: total === 0 ? 0 : (satisfatorios / total) * 100,
    piorZ,
    piorEnsaio,
  };
}

/* ---------------- Tendência entre rodadas ---------------- */

export type Tendencia = 'estavel' | 'tendencia-alta' | 'tendencia-baixa';

export interface AvaliacaoTendencia {
  tendencia: Tendencia;
  /** média dos z considerados */
  zMedio?: number;
  rodadas: number;
  /** explicação pronta para a tela */
  mensagem: string;
}

/** Quantas rodadas seguidas no mesmo lado já significam viés. */
const RODADAS_PARA_VIES = 3;

/**
 * Viés sistemático ao longo das rodadas.
 *
 * É o que o z de uma rodada sozinha não mostra. Um laboratório com
 * z = +1,4 em cinco rodadas seguidas passa em todas e está errado
 * em todas: o método tem desvio, não ruído. Um z = +2,6 isolado,
 * cercado de rodadas centradas, é muito menos preocupante.
 *
 * O critério é o sinal: `RODADAS_PARA_VIES` participações seguidas
 * do mesmo lado, com média acima de 1 σ. Abaixo disso é dispersão
 * normal e apontar viés seria alarme falso.
 *
 * Recebe os z em ordem cronológica; só as últimas participações
 * contam, porque viés corrigido não deve ficar pesando para sempre.
 */
export function avaliarTendencia(zs: number[]): AvaliacaoTendencia {
  const validos = zs.filter((z) => Number.isFinite(z));
  if (validos.length < RODADAS_PARA_VIES) {
    return {
      tendencia: 'estavel',
      rodadas: validos.length,
      mensagem: `${validos.length} ${validos.length === 1 ? 'rodada' : 'rodadas'}: `
        + `são precisas ${RODADAS_PARA_VIES} para avaliar tendência.`,
    };
  }

  const ultimos = validos.slice(-RODADAS_PARA_VIES);
  const zMedio = ultimos.reduce((s, z) => s + z, 0) / ultimos.length;
  const todosAcima = ultimos.every((z) => z > 0);
  const todosAbaixo = ultimos.every((z) => z < 0);

  if ((todosAcima || todosAbaixo) && Math.abs(zMedio) > 1) {
    const lado = todosAcima ? 'acima' : 'abaixo';
    return {
      tendencia: todosAcima ? 'tendencia-alta' : 'tendencia-baixa',
      zMedio,
      rodadas: ultimos.length,
      mensagem: `${ultimos.length} rodadas seguidas ${lado} do valor designado `
        + `(z médio ${zMedio.toFixed(2).replace('.', ',')}): o desvio é do método, não da rodada.`,
    };
  }

  return {
    tendencia: 'estavel',
    zMedio,
    rodadas: ultimos.length,
    mensagem: 'Sem viés sistemático nas últimas rodadas.',
  };
}

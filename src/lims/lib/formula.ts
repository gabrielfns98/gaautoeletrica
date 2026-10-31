/* ============================================================
   BANCADA — fórmulas dos calculados

   SB, CTC, V%, m%, H+Al pelo SMP, PRNT: cada um é uma conta sobre os
   outros resultados da mesma amostra, e cada laboratório — às vezes
   cada estado — usa equação diferente. CFSEMG estima H+Al por uma
   exponencial do índice SMP; o IAC usa tabela; quem trabalha com
   solo arenoso corrige o coeficiente. Com a conta cravada no código,
   todo laboratório que não usa a de Minas precisa de um programador.

   Por isso a fórmula é cadastro, e por isso ela é interpretada aqui
   em vez de passar por `eval`: o texto vem do banco, e `eval` daria
   a quem editar o cadastro o direito de rodar JavaScript na sessão
   de quem abrir o laudo.
   ============================================================ */

/* ---------------- Análise léxica ---------------- */

type Simbolo =
  | { tipo: 'numero'; valor: number }
  | { tipo: 'nome'; valor: string }
  | { tipo: 'operador'; valor: string }
  | { tipo: 'abre' }
  | { tipo: 'fecha' }
  | { tipo: 'virgula' };

/** Operadores, com precedência e associatividade. */
const OPERADORES: Record<string, { precedencia: number; direita?: boolean }> = {
  '+': { precedencia: 1 },
  '-': { precedencia: 1 },
  '*': { precedencia: 2 },
  '/': { precedencia: 2 },
  '^': { precedencia: 3, direita: true },
  /* Menos unário liga mais forte que * e /, senão "2 * -3" sairia
     errado; e menos forte que ^, para "-2 ^ 2" dar -4, como manda a
     convenção matemática em que as equações de fertilidade são
     escritas. */
  'u-': { precedencia: 2.5, direita: true },
};

/**
 * Funções permitidas. A lista é fechada de propósito: o que não está
 * aqui não existe para a fórmula, e um nome desconhecido vira erro em
 * vez de `undefined` silencioso.
 */
export const FUNCOES: Record<string, { aridade: number; aplicar: (...a: number[]) => number }> = {
  min: { aridade: 2, aplicar: (a, b) => Math.min(a, b) },
  max: { aridade: 2, aplicar: (a, b) => Math.max(a, b) },
  abs: { aridade: 1, aplicar: (a) => Math.abs(a) },
  exp: { aridade: 1, aplicar: (a) => Math.exp(a) },
  ln: { aridade: 1, aplicar: (a) => Math.log(a) },
  log: { aridade: 1, aplicar: (a) => Math.log10(a) },
  raiz: { aridade: 1, aplicar: (a) => Math.sqrt(a) },
  // Arredondamento com casas, porque laudo não publica 15 decimais.
  arred: { aridade: 2, aplicar: (a, c) => Number(a.toFixed(Math.max(0, Math.min(10, Math.trunc(c))))) },
  // Limita entre piso e teto: V% não passa de 100 nem fica negativo.
  limite: { aridade: 3, aplicar: (a, piso, teto) => Math.min(teto, Math.max(piso, a)) },
  se: { aridade: 3, aplicar: (cond, entao, senao) => (cond > 0 ? entao : senao) },
  /* Vale o primeiro quando o elemento foi medido, o segundo quando
     não foi. Variável ausente é NaN de propósito — zero calado dá
     CTC menor que a real —, mas há conta em que a ausência tem valor
     combinado: SB sem sódio é Ca + Mg + K, e o laboratório diz isso
     escrevendo `ou(NA; 0)` em vez de o motor adivinhar. */
  ou: { aridade: 2, aplicar: (valor, padrao) => (Number.isFinite(valor) ? valor : padrao) },
};

export class ErroFormula extends Error {}

/** Nome de variável: código de elemento como H+AL, P-MEL, PH-H2O. */
const INICIO_NOME = /[A-Za-zÀ-ÿ_]/;
const CORPO_NOME = /[A-Za-zÀ-ÿ0-9_+\-.]/;

function tokenizar(texto: string): Simbolo[] {
  const saida: Simbolo[] = [];
  let i = 0;

  while (i < texto.length) {
    const c = texto[i];

    if (/\s/.test(c)) { i += 1; continue; }

    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(texto[i + 1] ?? ''))) {
      let j = i;
      while (j < texto.length && /[0-9.,]/.test(texto[j])) j += 1;
      // Vírgula decimal é o que o laboratório digita.
      const bruto = texto.slice(i, j).replace(',', '.');
      const valor = Number(bruto);
      if (!Number.isFinite(valor)) throw new ErroFormula(`Número inválido: "${texto.slice(i, j)}"`);
      saida.push({ tipo: 'numero', valor });
      i = j;
      continue;
    }

    if (INICIO_NOME.test(c)) {
      let j = i;
      while (j < texto.length && CORPO_NOME.test(texto[j])) j += 1;
      /* "H+AL" é um nome, mas "CA+MG" é uma soma. O desempate: o sinal
         só fica dentro do nome se o que vem depois dele não começa
         outro nome — e ainda assim, só quando o nome inteiro resultante
         é conhecido. Como aqui não se sabe quais variáveis existem, a
         regra é mais simples e previsível: o sinal entra no nome, e
         quem escreve uma soma usa espaço, como em "CA + MG". */
      saida.push({ tipo: 'nome', valor: texto.slice(i, j) });
      i = j;
      continue;
    }

    if (c === '(') { saida.push({ tipo: 'abre' }); i += 1; continue; }
    if (c === ')') { saida.push({ tipo: 'fecha' }); i += 1; continue; }
    if (c === ';' || c === ',') { saida.push({ tipo: 'virgula' }); i += 1; continue; }

    if (c in OPERADORES) { saida.push({ tipo: 'operador', valor: c }); i += 1; continue; }

    throw new ErroFormula(`Caractere inesperado: "${c}"`);
  }

  return saida;
}

/* ---------------- Avaliação ---------------- */

/**
 * Compila para notação polonesa reversa (algoritmo de Dijkstra) e
 * avalia. Duas passagens em vez de uma árvore porque a fórmula é
 * curta e o resultado é o mesmo, com muito menos código para errar.
 */
function paraRPN(simbolos: Simbolo[]): Simbolo[] {
  const saida: Simbolo[] = [];
  const pilha: Simbolo[] = [];
  let anterior: Simbolo | undefined;

  for (const s of simbolos) {
    if (s.tipo === 'numero') { saida.push(s); anterior = s; continue; }

    if (s.tipo === 'nome') {
      // Nome seguido de "(" é função; os outros são variáveis.
      pilha.push(s);
      if (!(s.valor.toLowerCase() in FUNCOES)) {
        pilha.pop();
        saida.push(s);
      }
      anterior = s;
      continue;
    }

    if (s.tipo === 'virgula') {
      while (pilha.length > 0 && pilha[pilha.length - 1].tipo !== 'abre') saida.push(pilha.pop()!);
      if (pilha.length === 0) throw new ErroFormula('Vírgula fora de função.');
      anterior = s;
      continue;
    }

    if (s.tipo === 'operador') {
      /* "-" no começo, depois de outro operador, de "(" ou de ";" é
         negação, não subtração. */
      const unario = s.valor === '-'
        && (anterior === undefined || anterior.tipo === 'operador'
          || anterior.tipo === 'abre' || anterior.tipo === 'virgula');
      const simbolo: Simbolo = unario ? { tipo: 'operador', valor: 'u-' } : s;

      const info = OPERADORES[simbolo.valor];
      while (pilha.length > 0) {
        const topo = pilha[pilha.length - 1];
        if (topo.tipo !== 'operador') break;
        const topoInfo = OPERADORES[topo.valor];
        const maior = topoInfo.precedencia > info.precedencia;
        const igualEsquerda = topoInfo.precedencia === info.precedencia && !info.direita;
        if (!maior && !igualEsquerda) break;
        saida.push(pilha.pop()!);
      }
      pilha.push(simbolo);
      anterior = s;
      continue;
    }

    if (s.tipo === 'abre') { pilha.push(s); anterior = s; continue; }

    if (s.tipo === 'fecha') {
      while (pilha.length > 0 && pilha[pilha.length - 1].tipo !== 'abre') saida.push(pilha.pop()!);
      if (pilha.length === 0) throw new ErroFormula('Parêntese fechado sem abrir.');
      pilha.pop();
      // Função imediatamente antes do parêntese sai junto.
      const topo = pilha[pilha.length - 1];
      if (topo?.tipo === 'nome') saida.push(pilha.pop()!);
      anterior = s;
      continue;
    }
  }

  while (pilha.length > 0) {
    const topo = pilha.pop()!;
    if (topo.tipo === 'abre') throw new ErroFormula('Parêntese aberto sem fechar.');
    saida.push(topo);
  }
  return saida;
}

/** Normaliza o nome da variável como o cadastro escreve o código. */
const chave = (nome: string) => nome.trim().toUpperCase();

export interface ResultadoFormula {
  valor: number;
  /** variáveis que a fórmula pediu e não vieram */
  faltando: string[];
}

/**
 * Calcula a fórmula com os valores da amostra.
 *
 * Variável ausente não vira zero: zero é um resultado válido, e
 * somar o que não foi medido como se fosse zero produz CTC menor que
 * a real sem ninguém perceber. A conta devolve NaN e diz o que faltou.
 */
export function calcular(
  expressao: string,
  variaveis: Record<string, number | undefined>,
): ResultadoFormula {
  const rpn = paraRPN(tokenizar(expressao));
  const pilha: number[] = [];
  const faltando: string[] = [];

  const disponiveis = new Map<string, number | undefined>();
  for (const [k, v] of Object.entries(variaveis)) disponiveis.set(chave(k), v);

  for (const s of rpn) {
    if (s.tipo === 'numero') { pilha.push(s.valor); continue; }

    if (s.tipo === 'nome') {
      const fn = FUNCOES[s.valor.toLowerCase()];
      if (fn) {
        if (pilha.length < fn.aridade) {
          throw new ErroFormula(`A função ${s.valor} precisa de ${fn.aridade} argumento(s).`);
        }
        const args = pilha.splice(pilha.length - fn.aridade, fn.aridade);
        pilha.push(fn.aplicar(...args));
        continue;
      }

      const k = chave(s.valor);
      if (!disponiveis.has(k) || disponiveis.get(k) === undefined) {
        if (!faltando.includes(k)) faltando.push(k);
        pilha.push(Number.NaN);
        continue;
      }
      pilha.push(disponiveis.get(k)!);
      continue;
    }

    if (s.tipo === 'operador') {
      if (s.valor === 'u-') {
        if (pilha.length < 1) throw new ErroFormula('Falta operando para a negação.');
        pilha.push(-pilha.pop()!);
        continue;
      }
      if (pilha.length < 2) throw new ErroFormula(`Falta operando para "${s.valor}".`);
      const b = pilha.pop()!;
      const a = pilha.pop()!;
      switch (s.valor) {
        case '+': pilha.push(a + b); break;
        case '-': pilha.push(a - b); break;
        case '*': pilha.push(a * b); break;
        // Divisão por zero devolve NaN, não Infinity: Infinity num
        // laudo vira "∞ cmolc/dm³", que não é resultado nenhum.
        case '/': pilha.push(b === 0 ? Number.NaN : a / b); break;
        case '^': pilha.push(a ** b); break;
        default: throw new ErroFormula(`Operador desconhecido: ${s.valor}`);
      }
      continue;
    }

    throw new ErroFormula('Expressão malformada.');
  }

  if (pilha.length !== 1) throw new ErroFormula('Expressão malformada.');
  return { valor: pilha[0], faltando };
}

/**
 * Confere a fórmula sem calcular — para a tela de cadastro avisar
 * antes de salvar, em vez de o erro aparecer no meio de um laudo.
 */
export function validarFormula(
  expressao: string,
  codigosConhecidos: string[],
): { ok: boolean; erro?: string; variaveis: string[]; desconhecidas: string[] } {
  if (!expressao.trim()) return { ok: false, erro: 'Fórmula vazia.', variaveis: [], desconhecidas: [] };

  let simbolos: Simbolo[];
  try {
    simbolos = tokenizar(expressao);
  } catch (e) {
    return { ok: false, erro: (e as Error).message, variaveis: [], desconhecidas: [] };
  }

  const variaveis = [...new Set(
    simbolos
      .filter((s): s is { tipo: 'nome'; valor: string } => s.tipo === 'nome')
      .map((s) => s.valor)
      .filter((n) => !(n.toLowerCase() in FUNCOES))
      .map(chave),
  )];

  const conhecidos = new Set(codigosConhecidos.map(chave));
  const desconhecidas = variaveis.filter((v) => !conhecidos.has(v));

  // Um cálculo de teste pega parêntese solto e operando faltando.
  try {
    calcular(expressao, Object.fromEntries(variaveis.map((v) => [v, 1])));
  } catch (e) {
    return { ok: false, erro: (e as Error).message, variaveis, desconhecidas };
  }

  if (desconhecidas.length > 0) {
    return {
      ok: false,
      erro: `Elemento não cadastrado: ${desconhecidas.join(', ')}.`,
      variaveis,
      desconhecidas,
    };
  }
  return { ok: true, variaveis, desconhecidas };
}

/* ---------------- Aplicação aos resultados da amostra ---------------- */

export interface Calculado {
  parametroId: string;
  codigo: string;
  valor: number;
  /** o que a fórmula pediu e a amostra não tinha */
  faltando: string[];
  erro?: string;
}

interface ParametroMinimo { id: string; codigo: string; grupoId: string }
interface FormulaMinima {
  id: string; parametroId: string; expressao: string;
  grupoId?: string; ativa: boolean;
}

/**
 * Calcula todos os derivados de uma amostra, na ordem em que um
 * depende do outro.
 *
 * V% precisa de CTC, que precisa de SB, que precisa de Ca, Mg, K e
 * Na. Resolver numa passagem só daria V% vazio na primeira vez e
 * certo na segunda — então a função repete enquanto algo novo for
 * resolvido, e para quando uma rodada inteira não resolve mais nada.
 * Isso também encerra sozinho um ciclo (A depende de B, B de A): os
 * dois ficam sem valor, em vez de girar para sempre.
 */
export function calcularDerivados(
  formulas: FormulaMinima[],
  parametros: ParametroMinimo[],
  grupoId: string,
  medidos: Record<string, number | undefined>,
): Calculado[] {
  const porId = new Map(parametros.map((p) => [p.id, p]));

  /* Fórmula do grupo vence a geral: um laboratório pode calcular CTC
     de um jeito para solo e de outro para substrato. */
  const aplicaveis = new Map<string, FormulaMinima>();
  for (const f of formulas) {
    if (!f.ativa) continue;
    if (f.grupoId && f.grupoId !== grupoId) continue;
    const alvo = porId.get(f.parametroId);
    if (!alvo || alvo.grupoId !== grupoId) continue;
    const atual = aplicaveis.get(f.parametroId);
    if (!atual || (!atual.grupoId && f.grupoId)) aplicaveis.set(f.parametroId, f);
  }

  /* O que esta chamada vai calcular não pode entrar como dado de
     partida. O valor derivado que está gravado na amostra é o de
     antes: deixá-lo em `valores` faz uma fórmula consumir a versão
     velha da outra — CTC somando o H+Al antigo enquanto o novo era
     calculado na mesma passagem, e V% saindo errado atrás dele. */
  const valores: Record<string, number | undefined> = { ...medidos };
  for (const parametroId of aplicaveis.keys()) {
    const alvo = porId.get(parametroId);
    if (alvo) delete valores[alvo.codigo.toUpperCase()];
  }
  const resolvidos = new Map<string, Calculado>();
  const pendentes = new Set(aplicaveis.keys());

  let mudou = true;
  while (mudou && pendentes.size > 0) {
    mudou = false;

    for (const parametroId of [...pendentes]) {
      const formula = aplicaveis.get(parametroId)!;
      const alvo = porId.get(parametroId)!;

      let resultado: Calculado;
      try {
        const { valor, faltando } = calcular(formula.expressao, valores);
        resultado = { parametroId, codigo: alvo.codigo, valor, faltando };
      } catch (e) {
        resultado = {
          parametroId, codigo: alvo.codigo, valor: Number.NaN,
          faltando: [], erro: (e as Error).message,
        };
        pendentes.delete(parametroId);
        resolvidos.set(parametroId, resultado);
        mudou = true;
        continue;
      }

      // Só sai da fila quando tem número: o que falta pode chegar
      // de outra fórmula na volta seguinte.
      if (Number.isFinite(resultado.valor)) {
        valores[alvo.codigo.toUpperCase()] = resultado.valor;
        resolvidos.set(parametroId, resultado);
        pendentes.delete(parametroId);
        mudou = true;
      } else {
        resolvidos.set(parametroId, resultado);
      }
    }
  }

  return [...resolvidos.values()];
}

/* ---------------- Lançamento: o que o calculado acrescenta ---------------- */

interface EnsaioMinimo {
  id: string; amostraId: string; parametroId: string; valor?: number;
}
interface AmostraMinima { id: string; grupoId: string }

/**
 * Dado um lote de resultados que o analista acabou de lançar, quais
 * resultados calculados saem junto.
 *
 * Mora aqui, e não na tela, porque o laboratório lança resultado por
 * três caminhos — digitando na grade, importando planilha e lendo o
 * potenciômetro — e os calculados têm de sair igual nos três. Ligar
 * cada tela por sua conta é a forma mais barata de ter SB numa e não
 * na outra.
 *
 * Só devolve ensaio que já existe na amostra: o laboratório decidiu
 * no escopo se quer CTC naquele protocolo, e o lançamento não é hora
 * de acrescentar ensaio que ninguém pediu.
 */
export function entradasDerivadas(
  entradas: Array<{ ensaioId: string; valor: number }>,
  estado: {
    ensaios: EnsaioMinimo[];
    amostras: AmostraMinima[];
    parametros: ParametroMinimo[];
    formulas: FormulaMinima[];
  },
): Array<{ ensaioId: string; valor: number }> {
  if (entradas.length === 0) return [];

  const ensaioPorId = new Map(estado.ensaios.map((e) => [e.id, e]));
  const parametroPorId = new Map(estado.parametros.map((p) => [p.id, p]));
  const amostraPorId = new Map(estado.amostras.map((a) => [a.id, a]));

  /* Os valores que o lançamento está gravando valem mais que os que
     estão no estado: são justamente os que mudaram. */
  const novoValor = new Map(entradas.map((e) => [e.ensaioId, e.valor]));

  const amostrasTocadas = new Set<string>();
  for (const { ensaioId } of entradas) {
    const ensaio = ensaioPorId.get(ensaioId);
    if (ensaio) amostrasTocadas.add(ensaio.amostraId);
  }

  const saida: Array<{ ensaioId: string; valor: number }> = [];

  for (const amostraId of amostrasTocadas) {
    const amostra = amostraPorId.get(amostraId);
    if (!amostra) continue;

    const daAmostra = estado.ensaios.filter((e) => e.amostraId === amostraId);

    const medidos: Record<string, number | undefined> = {};
    for (const e of daAmostra) {
      const p = parametroPorId.get(e.parametroId);
      if (!p) continue;
      const valor = novoValor.has(e.id) ? novoValor.get(e.id) : e.valor;
      if (valor !== undefined) medidos[p.codigo.toUpperCase()] = valor;
    }

    const derivados = calcularDerivados(estado.formulas, estado.parametros, amostra.grupoId, medidos);

    for (const d of derivados) {
      if (!Number.isFinite(d.valor)) continue;
      const alvo = daAmostra.find((e) => e.parametroId === d.parametroId);
      if (!alvo) continue;
      // Não regrava o que o próprio lote já traz nem o que não mudou.
      if (novoValor.has(alvo.id)) continue;
      if (alvo.valor !== undefined && Math.abs(alvo.valor - d.valor) < 1e-9) continue;
      saida.push({ ensaioId: alvo.id, valor: d.valor });
    }
  }

  return saida;
}

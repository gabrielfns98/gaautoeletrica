import {
  CRITERIOS_CURVA, ajustarCurva, concentracaoDaLeitura, leituraDaConcentracao,
  situacaoDoResultado, rotuloSituacao,
} from './curva';
import type { PontoCurva } from '../types';

let falhas = 0;
const perto = (a: number, b: number, tol: number, msg: string) => {
  if (Math.abs(a - b) > tol) { falhas++; console.log(`FALHOU ${msg}: ${a} ≠ ${b} (±${tol})`); }
  else console.log(`ok   ${msg}: ${a.toFixed(5)}`);
};
const igual = (a: unknown, b: unknown, msg: string) => {
  if (a !== b) { falhas++; console.log(`FALHOU ${msg}: ${String(a)} ≠ ${String(b)}`); }
  else console.log(`ok   ${msg}: ${String(a)}`);
};

/* ---- curva perfeita: abs = 0,25·C + 0,02 ---- */
const perfeita: PontoCurva[] = [0, 2, 4, 6, 8, 10].map((c) => ({
  concentracao: c, leitura: 0.25 * c + 0.02,
}));
const aj = ajustarCurva(perfeita);
perto(aj.coefAngular, 0.25, 1e-9, 'coeficiente angular');
perto(aj.coefLinear, 0.02, 1e-9, 'intercepto');
perto(aj.r2, 1, 1e-9, 'R² de curva perfeita');
perto(aj.desvioResidual, 0, 1e-9, 'resíduo nulo');
igual(aj.aprovada, true, 'curva perfeita aprovada');
igual(aj.pontosUsados, 6, 'pontos usados');

/* ---- ida e volta leitura <-> concentração ---- */
for (const c of [0.5, 3.7, 9.2]) {
  perto(concentracaoDaLeitura(leituraDaConcentracao(c, aj), aj), c, 1e-9, `ida e volta em C=${c}`);
}

/* ---- diluição multiplica no fim ---- */
perto(concentracaoDaLeitura(leituraDaConcentracao(4, aj), aj, 10), 40, 1e-9,
  'diluição 1:10 multiplica a concentração');

/* ---- ponto descartado sai do ajuste ---- */
const comOutlier: PontoCurva[] = [...perfeita, { concentracao: 12, leitura: 9.9 }];
const semDescarte = ajustarCurva(comOutlier);
igual(semDescarte.r2 < 0.99, true, 'outlier derruba o R²');
const comDescarte = ajustarCurva([...perfeita, { concentracao: 12, leitura: 9.9, descartado: true }]);
perto(comDescarte.r2, 1, 1e-9, 'descartar o outlier restaura a linearidade');
igual(comDescarte.pontosUsados, 6, 'ponto descartado não conta');

/* ---- ajuste pela origem ---- */
const pelaOrigem = ajustarCurva(
  [0, 2, 4, 6].map((c) => ({ concentracao: c, leitura: 0.3 * c })),
  'linear-sem-intercepto',
);
perto(pelaOrigem.coefAngular, 0.3, 1e-9, 'origem: coeficiente angular');
igual(pelaOrigem.coefLinear, 0, 'origem: intercepto preso em zero');
perto(pelaOrigem.r2, 1, 1e-9, 'origem: R²');

/* ---- curva com ruído: LOD e LOQ saem do resíduo ---- */
const ruidosa: PontoCurva[] = [
  { concentracao: 0, leitura: 0.021 },
  { concentracao: 2, leitura: 0.517 },
  { concentracao: 4, leitura: 1.028 },
  { concentracao: 6, leitura: 1.509 },
  { concentracao: 8, leitura: 2.041 },
];
const rn = ajustarCurva(ruidosa);
igual(rn.desvioResidual > 0, true, 'curva com ruído tem resíduo');
perto(rn.loq / rn.lod, 10 / 3.3, 1e-9, 'LQ/LD = 10/3,3');
igual(rn.lod < rn.loq, true, 'LD menor que LQ');
igual(rn.r2 > CRITERIOS_CURVA.r2Min, true, 'ruído pequeno ainda aprova');

/* ---- curva ruim é reprovada e avisa ---- */
const ruim = ajustarCurva([
  { concentracao: 0, leitura: 0.10 },
  { concentracao: 2, leitura: 0.95 },
  { concentracao: 4, leitura: 0.42 },
  { concentracao: 6, leitura: 1.80 },
]);
igual(ruim.aprovada, false, 'curva não linear reprovada');
igual(ruim.avisos.some((a) => a.includes('Linearidade')), true, 'avisa sobre linearidade');

/* ---- sinal que não responde ---- */
const plana = ajustarCurva([0, 2, 4].map((c) => ({ concentracao: c, leitura: 0.5 })));
igual(plana.coefAngular, 0, 'sinal constante dá coeficiente nulo');
igual(plana.aprovada, false, 'curva plana reprovada');
igual(Number.isNaN(concentracaoDaLeitura(0.5, plana)), true, 'curva plana não quantifica');

/* ---- situação do resultado ---- */
const limites = { lod: 0.5, loq: 1.5 };
igual(situacaoDoResultado(0.2, limites), 'abaixo-lod', 'abaixo do LD');
igual(situacaoDoResultado(1.0, limites), 'entre-lod-loq', 'detectado mas não quantificável');
igual(situacaoDoResultado(4.0, limites), 'quantificavel', 'dentro da faixa');
igual(situacaoDoResultado(40, limites, 10), 'acima-faixa', 'acima do maior padrão');
igual(rotuloSituacao('entre-lod-loq', limites), '< LQ (1.50)', 'rótulo de < LQ');
igual(rotuloSituacao('acima-faixa', limites).includes('diluir'), true, 'rótulo manda diluir');

/* ---- entrada degenerada ---- */
igual(ajustarCurva([]).aprovada, false, 'curva vazia');
igual(ajustarCurva([{ concentracao: 1, leitura: 1 }]).aprovada, false, 'um ponto só');
igual(Number.isNaN(concentracaoDaLeitura(NaN, aj)), true, 'leitura inválida');

console.log(falhas === 0 ? '\nTODOS OS TESTES DE CURVA PASSARAM' : `\n${falhas} FALHA(S)`);
if (falhas) process.exit(1);

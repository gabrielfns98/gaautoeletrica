import {
  slopeTeorico, valorTampao, calcularCalibracao, phDeMv, mvDePh,
  analisarEstabilidade, avaliarCQ, classificarPh, hMaisAlPorSmp,
  necessidadeCalagem, analisarReplicas, corrigirPara25C,
} from './ph';

let fails = 0;
const near = (a: number, b: number, tol: number, msg: string) => {
  const ok = Math.abs(a - b) <= tol;
  if (!ok) { fails++; console.log(`FAIL ${msg}: got ${a}, expected ~${b} (±${tol})`); }
  else console.log(`ok   ${msg}: ${typeof a === 'number' ? a.toFixed(4) : a}`);
};
const eq = (a: unknown, b: unknown, msg: string) => {
  if (a !== b) { fails++; console.log(`FAIL ${msg}: got ${String(a)}, expected ${String(b)}`); }
  else console.log(`ok   ${msg}: ${String(a)}`);
};

// --- Nernst ---
near(slopeTeorico(25), 59.16, 0.01, 'slope teorico @25C = 59.16 mV/pH');
near(slopeTeorico(0), 54.20, 0.05, 'slope teorico @0C');
near(slopeTeorico(50), 64.12, 0.05, 'slope teorico @50C');

// --- Tampões DIN/NIST ---
near(valorTampao(7.00, 25), 7.00, 1e-9, 'tampao 7 @25C');
near(valorTampao(7.00, 20), 7.02, 1e-9, 'tampao 7 @20C');
near(valorTampao(7.00, 22.5), 7.01, 1e-9, 'tampao 7 @22.5C (interpolado)');
near(valorTampao(4.01, 25), 4.01, 1e-9, 'tampao 4 @25C');
near(valorTampao(10.01, 30), 9.96, 1e-9, 'tampao 10 @30C');

// --- Calibração de eletrodo ideal: slope 100%, offset 0 ---
const ideal = calcularCalibracao([
  { tampao: 4.01, mV: 59.16 * (7 - 4.01), temperatura: 25 },
  { tampao: 7.00, mV: 0, temperatura: 25 },
  { tampao: 10.01, mV: 59.16 * (7 - 10.01), temperatura: 25 },
]);
near(ideal.slopeMvPorPh, 59.16, 0.01, 'calib ideal slope mV/pH');
near(ideal.slopePercentual, 100, 0.05, 'calib ideal slope %');
near(ideal.offsetMv, 0, 1e-6, 'calib ideal offset');
near(ideal.r2, 1, 1e-9, 'calib ideal R2');
eq(ideal.aprovada, true, 'calib ideal aprovada');

// --- Eletrodo gasto: slope 92%, offset +35 mV → reprovado com 2 avisos ---
const gasto = calcularCalibracao([
  { tampao: 4.01, mV: 35 + 0.92 * 59.16 * (7 - 4.01), temperatura: 25 },
  { tampao: 7.00, mV: 35, temperatura: 25 },
  { tampao: 10.01, mV: 35 + 0.92 * 59.16 * (7 - 10.01), temperatura: 25 },
]);
near(gasto.slopePercentual, 92, 0.1, 'calib gasta slope %');
near(gasto.offsetMv, 35, 0.01, 'calib gasta offset mV');
eq(gasto.aprovada, false, 'calib gasta reprovada');
eq(gasto.avisos.length >= 2, true, 'calib gasta gera avisos de slope e offset');

// --- Ida e volta mV <-> pH ---
const cal = { slopeMvPorPh: 58.2, offsetMv: -4.3, temperaturaCalibracao: 25 };
for (const [ph, t] of [[5.42, 25], [7.00, 25], [8.90, 30], [4.10, 18]] as const) {
  near(phDeMv(mvDePh(ph, t, cal), t, cal), ph, 1e-9, `roundtrip pH ${ph} @${t}C`);
}
// pH 7 exato deve dar o offset como potencial
near(mvDePh(7, 25, cal), -4.3, 1e-9, 'mV em pH 7 = offset');

// --- ATC: mesmo mV em T diferente da pH diferente ---
// Amostra acida (E acima do isopotencial): slope menor (frio) amplia o
// desvio em unidades de pH, entao o pH lido cai.
const phFrio = phDeMv(50, 15, cal);
const phQuente = phDeMv(50, 35, cal);
near(phFrio, 6.0346, 1e-3, 'ATC pH @15C');
near(phQuente, 6.0973, 1e-3, 'ATC pH @35C');
eq(phFrio < phQuente, true, 'ATC: amostra acida, menor T => menor pH lido');
// Amostra alcalina: o sinal se inverte.
const alcFrio = phDeMv(-120, 15, cal);
const alcQuente = phDeMv(-120, 35, cal);
eq(alcFrio > alcQuente, true, 'ATC: amostra alcalina, menor T => maior pH lido');
// Em pH 7 a temperatura e irrelevante (ponto isopotencial).
near(phDeMv(cal.offsetMv, 5, cal), 7, 1e-9, 'isopotencial independe de T');
near(phDeMv(cal.offsetMv, 45, cal), 7, 1e-9, 'isopotencial independe de T (quente)');

// --- Correção para 25 C ---
near(corrigirPara25C(5.50, 30, 'H2O'), 5.53, 1e-9, 'solo medido a 30C sobe ao normalizar p/ 25C');
near(corrigirPara25C(5.50, 25, 'H2O'), 5.50, 1e-9, 'sem correcao a 25C');

// --- Estabilidade ---
const estavel = Array.from({ length: 30 }, (_, i) => ({ t: i, mV: 12.0 + Math.sin(i) * 0.02, ph: 5.4, temperatura: 25 }));
eq(analisarEstabilidade(estavel).estavel, true, 'trace plano => estavel');
const derivando = Array.from({ length: 30 }, (_, i) => ({ t: i, mV: 12.0 + i * 0.5, ph: 5.4, temperatura: 25 }));
const d = analisarEstabilidade(derivando);
eq(d.estavel, false, 'trace em deriva => instavel');
near(d.derivaMvPorMin, 30, 0.5, 'deriva 0.5 mV/s = 30 mV/min');
eq(analisarEstabilidade([]).estavel, false, 'trace vazio => instavel');

// --- Réplicas ---
const rep = analisarReplicas([5.42, 5.45, 5.43]);
near(rep.media, 5.4333, 1e-3, 'media das replicas');
eq(rep.conforme, true, 'RSD baixo => conforme');
eq(analisarReplicas([5.0, 6.0]).conforme, false, 'RSD alto => nao conforme');

// --- Westgard ---
eq(avaliarCQ([5.52], 5.52, 0.05).resultado, 'aprovado', 'CQ no alvo');
eq(avaliarCQ([5.52, 5.78], 5.52, 0.05).regraViolada, '1-3s', 'CQ 1-3s');
eq(avaliarCQ([5.65, 5.65], 5.52, 0.05).regraViolada, '2-2s', 'CQ 2-2s');
eq(avaliarCQ([5.40, 5.65], 5.52, 0.05).regraViolada, 'R-4s', 'CQ R-4s');
eq(avaliarCQ([5.58, 5.58, 5.58, 5.58], 5.52, 0.05).regraViolada, '4-1s', 'CQ 4-1s');
eq(avaliarCQ(Array(10).fill(5.53), 5.52, 0.05).regraViolada, '10x', 'CQ 10x');
eq(avaliarCQ([5.63], 5.52, 0.05).resultado, 'alerta', 'CQ 1-2s alerta');

// --- Classificação agronômica ---
eq(classificarPh(4.2, 'H2O').rotulo, 'Muito baixo', 'CFSEMG muito baixo');
eq(classificarPh(5.8, 'H2O').rotulo, 'Bom', 'CFSEMG bom');
eq(classificarPh(7.6, 'H2O').rotulo, 'Muito alto', 'CFSEMG muito alto');
eq(classificarPh(4.2, 'CaCl2').rotulo, 'Acidez muito alta', 'Boletim 100 muito alta');
eq(classificarPh(5.8, 'CaCl2').rotulo, 'Acidez baixa', 'Boletim 100 baixa');
eq(classificarPh(7.5, 'direto').rotulo, 'Conforme', 'CONAMA 430 conforme');
eq(classificarPh(4.4, 'direto').rotulo, 'Ácido', 'CONAMA 430 fora');
eq(classificarPh(NaN, 'H2O').rotulo, '—', 'sem leitura');

// --- Agronomia ---
near(hMaisAlPorSmp(5.5), Math.exp(7.76 - 1.053 * 5.5), 1e-9, 'H+Al por SMP');
eq(hMaisAlPorSmp(4.5) > hMaisAlPorSmp(6.5), true, 'H+Al cai quando pH SMP sobe');
near(necessidadeCalagem(8.0, 40, 70, 85), (8 * 30) / 85, 1e-9, 'necessidade de calagem');
eq(necessidadeCalagem(8.0, 80, 70, 85), 0, 'V atual acima do desejado => NC 0');

console.log(fails === 0 ? '\nTODOS OS TESTES PASSARAM' : `\n${fails} FALHA(S)`);
if (fails) process.exit(1);

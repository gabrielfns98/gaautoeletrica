/* ============================================================
   Vídeo promocional — captura das telas

   Roda o próprio sistema, com a massa de demonstração, e fotografa
   as telas que o vídeo mostra. Cada cena faz o que a legenda diz —
   protocolar um lote, ler o pH no aparelho, abrir o laudo — para
   que a imagem seja a tela de verdade depois da ação, e não uma
   montagem.

   O roteiro segue o fluxo do material comercial da DSM: recepção,
   etiquetas, bancada, revisão e laudo. O tema é o claro, o mesmo das
   peças que a DSM já mostra aos clientes.

   Uso (com o sistema rodando: npx vite --host 127.0.0.1 --port 8080):
     node marketing/motion/capturar.mjs [http://127.0.0.1:8080/lab] [--tema escuro]

   Saída em marketing/motion/assets/telas/: um PNG por cena e
   manifesto.js com o tamanho de cada imagem e a caixa (em pixels
   CSS) do elemento que o vídeo destaca.
   ============================================================ */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const aqui = dirname(fileURLToPath(import.meta.url));
const SAIDA = resolve(aqui, 'assets/telas');
const { values: opcoes, positionals } = parseArgs({
  allowPositionals: true,
  options: { tema: { type: 'string', default: 'claro' } },
});
const BASE = positionals[0] ?? 'http://127.0.0.1:8080/lab';
const TEMA = opcoes.tema === 'escuro' ? 'dark' : 'light';
const PW = process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright/index.js';

const { default: playwright } = await import(PW);
const { chromium } = playwright;

const LARGURA = 1280;
const ALTURA = 800;

mkdirSync(SAIDA, { recursive: true });

const navegador = await chromium.launch();
const contexto = await navegador.newContext({
  viewport: { width: LARGURA, height: ALTURA },
  deviceScaleFactor: 2,
});
// O tema fica guardado no navegador; definido antes de o sistema abrir.
await contexto.addInitScript((tema) => localStorage.setItem('bancada:tema', tema), TEMA);
const p = await contexto.newPage();
p.on('pageerror', (e) => console.error('erro na página:', e.message));

const espera = (ms) => p.waitForTimeout(ms);

/* O selo "Dados de demonstração" e o botão de ajuda são verdadeiros
   no sistema, mas no vídeo só distraem: a legenda do próprio vídeo
   avisa que os dados são fictícios. */
const limpar = () => p.addStyleTag({
  content: `
    header > div:has(svg.lucide-flask-conical) { display: none !important; }
    button[aria-label="Abrir assistente de ajuda"] { display: none !important; }
    * { caret-color: transparent !important; }
  `,
});

const menu = async (nome) => {
  // O nome do link pode trazer o contador ao lado ("Bancada 32").
  await p.locator('aside nav').getByRole('link', { name: new RegExp(`^${nome}\\b`) }).first().click();
  await espera(1200);
  // A rolagem da tela anterior não vale para a próxima.
  await p.evaluate(() => window.scrollTo(0, 0));
  await espera(200);
  await limpar();
};

/** Caixa de um elemento em pixels CSS, relativa à janela. */
const caixa = async (locator) => {
  const b = await locator.boundingBox();
  if (!b) throw new Error('elemento sem caixa');
  return { x: b.x, y: b.y, w: b.width, h: b.height };
};

/** Rola a página para que o elemento fique a `margem` pixels do topo. */
const rolarAte = async (locator, margem) => {
  await locator.scrollIntoViewIfNeeded();
  const b = await caixa(locator);
  await p.evaluate((dy) => window.scrollBy(0, dy), b.y - margem);
  await espera(300);
};

const manifesto = {};
const fotografar = async (nome, destaque, extra = {}) => {
  await p.screenshot({ path: `${SAIDA}/${nome}.png` });
  manifesto[nome] = { largura: LARGURA, altura: ALTURA, destaque, ...extra };
  console.log(`  ${nome}.png`);
};

console.log(`Capturando telas de ${BASE} (tema ${opcoes.tema})`);
await p.goto(`${BASE}?demo=1`, { waitUntil: 'networkidle' });
await espera(2500);
await limpar();

/* ---------- Painel ---------- */
await fotografar('painel', null);

/* ---------- Recepção: protocolar um lote ---------- */
await menu('Recepção');
await p.getByRole('button', { name: /Protocolar lote/ }).click();
await espera(700);
await p.evaluate(() => window.scrollTo(0, 170));
await espera(250);
await fotografar('recepcao', await caixa(p.locator('[data-sonner-toast]').first()));
await p.evaluate(() => window.scrollTo(0, 0));
// O aviso sai antes da próxima cena, para não aparecer de novo.
await espera(4500);

/* ---------- Etiquetas: código de barras de cada amostra ---------- */
await menu('Etiquetas');
const etiquetas = p.locator('.folha-etiquetas .etiqueta');
await rolarAte(p.locator('.folha-etiquetas'), 150);
// A primeira etiqueta do lote recém-protocolado: legível com o zoom.
await fotografar('etiquetas', await caixa(etiquetas.nth(0)));

/* ---------- Bancada: o pHmetro entrega a leitura ---------- */
await menu('Bancada');
await p.getByRole('button', { name: /Iniciar leitura/ }).click();
// A bancada virtual estabiliza como um eletrodo de verdade: leva alguns segundos.
await p.locator('[data-sonner-toast]').filter({ hasText: 'Leitura estável capturada' })
  .first().waitFor({ timeout: 120_000 });
await espera(400);
const mostrador = p.locator('.panel-sunken').filter({ hasText: 'Leitura potenciométrica' }).first();
await rolarAte(mostrador, 96);
await fotografar('bancada', await caixa(mostrador), {
  aviso: await caixa(p.locator('[data-sonner-toast]').first()),
});
await p.getByRole('button', { name: /Parar leitura/ }).click().catch(() => {});
await espera(4500);

/* ---------- Resultados lançados por quem está no sistema ----------
   Esta cena não entra no vídeo. A revisão só tem o que bloquear se a
   usuária tiver lançado resultado: é isso que faz o contador "Bloqueados
   para você" mostrar a segregação de funções funcionando. */
await menu('Resultados');
await p.locator('#f-tipo').click();
await p.getByRole('option', { name: /Fertilidade completa/ }).click();
await espera(300);
await p.getByRole('button', { name: /Pesquisar/ }).click();
await espera(900);
await p.getByRole('tab', { name: /Lançamento/ }).click();
await espera(900);
// Solos de cerrado corrigidos, dentro das faixas reais.
const LANCAMENTOS = [
  { 'pH em água': '5,6', 'Índice SMP': '6,3', 'Matéria orgânica': '28', 'Fósforo (Mehlich-1)': '14,2', 'Potássio trocável': '96', 'Cálcio trocável': '2,8', 'Magnésio trocável': '0,9', 'Alumínio trocável': '0,1' },
  { 'pH em água': '5,1', 'Índice SMP': '5,9', 'Matéria orgânica': '22', 'Fósforo (Mehlich-1)': '8,6', 'Potássio trocável': '71', 'Cálcio trocável': '1,7', 'Magnésio trocável': '0,6', 'Alumínio trocável': '0,4' },
  { 'pH em água': '6,0', 'Índice SMP': '6,6', 'Matéria orgânica': '33', 'Fósforo (Mehlich-1)': '21,5', 'Potássio trocável': '128', 'Cálcio trocável': '3,6', 'Magnésio trocável': '1,2', 'Alumínio trocável': '0,0' },
  { 'pH em água': '5,4', 'Índice SMP': '6,1', 'Matéria orgânica': '25', 'Fósforo (Mehlich-1)': '11,8', 'Potássio trocável': '88', 'Cálcio trocável': '2,3', 'Magnésio trocável': '0,8', 'Alumínio trocável': '0,2' },
];
const linhas = p.locator('main table').first().locator('tbody tr');
for (const [i, valores] of LANCAMENTOS.entries()) {
  for (const [rotulo, valor] of Object.entries(valores)) {
    await linhas.nth(i).locator(`input[aria-label^="${rotulo}"]`).fill(valor);
  }
}
await p.getByRole('button', { name: /^Gravar$/ }).click();
await espera(4500);

/* ---------- Revisão: quem lançou não aprova ---------- */
await menu('Revisão');
const bloqueados = p.locator('main').getByText('Bloqueados para você', { exact: true }).first();
const cartao = await bloqueados.evaluateHandle((el) => el.closest('.panel') ?? el.parentElement?.parentElement);
const caixaCartao = await cartao.asElement()?.boundingBox();
await fotografar('revisao', caixaCartao
  ? { x: caixaCartao.x, y: caixaCartao.y, w: caixaCartao.width, h: caixaCartao.height }
  : await caixa(bloqueados));

/* ---------- Laudo foliar, como sai no PDF ---------- */
await menu('Laudos');
const filas = p.locator('main tbody tr');
const total = await filas.count();
for (let i = 0; i < Math.min(total, 60); i++) {
  const texto = await filas.nth(i).innerText();
  if (!/Foliar|Tecido/i.test(texto) || !/Emitido/i.test(texto)) continue;
  await filas.nth(i).click();
  await espera(1400);
  if (await p.locator('.folha-laudo').count()) break;
  await p.keyboard.press('Escape');
  await espera(300);
}
/* Em mídia de impressão a folha fica branca, com o texto escuro —
   exatamente o PDF que o cliente recebe. */
await p.emulateMedia({ media: 'print' });
await espera(500);
const pagina = p.locator('.folha-laudo .pagina-laudo').first();
await pagina.screenshot({ path: `${SAIDA}/laudo.png` });
// Medida depois da foto: fotografar rola a folha, e as caixas abaixo
// precisam estar na mesma rolagem que a página.
const caixaPagina = await caixa(pagina);
const naPagina = (c) => ({ x: c.x - caixaPagina.x, y: c.y - caixaPagina.y, w: c.w, h: c.h });

// Assinatura do responsável técnico: o traço, o nome, o registro e o cargo.
const assinatura = pagina.locator('div.shrink-0.text-center').last();
const caixaAssinatura = await caixa(assinatura);
// A coluna inteira das barras, sem invadir a do resultado ao lado.
const cabSuficiencia = await caixa(pagina.getByText(/n[íi]vel de sufici[êe]ncia/i).first());
const linhasLaudo = pagina.locator('tbody').first().locator('tr');
const nLinhas = await linhasLaudo.count();
const fimSuficiencia = await caixa(linhasLaudo.nth(Math.min(nLinhas - 1, 10)));
const numeroLaudo = (await p.locator('[role="dialog"]').getByText(/^LA-\d{4}-\d+$/).first().innerText().catch(() => 'LA-2026-03152')).trim();
manifesto.laudo = {
  largura: caixaPagina.w,
  altura: caixaPagina.h,
  numero: numeroLaudo,
  destaque: naPagina({
    x: caixaAssinatura.x - 14, y: caixaAssinatura.y - 10,
    w: caixaAssinatura.w + 28, h: caixaAssinatura.h + 18,
  }),
  suficiencia: naPagina({
    x: cabSuficiencia.x + 6,
    y: cabSuficiencia.y - 8,
    w: cabSuficiencia.w - 10,
    h: fimSuficiencia.y + fimSuficiencia.h - cabSuficiencia.y + 14,
  }),
};
console.log('  laudo.png');

writeFileSync(`${SAIDA}/manifesto.js`, `window.MANIFESTO = ${JSON.stringify(manifesto, null, 2)};\n`);
console.log('  manifesto.js');
await navegador.close();

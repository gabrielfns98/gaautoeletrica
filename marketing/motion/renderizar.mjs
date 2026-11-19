/* ============================================================
   Vídeo promocional — renderização

   Abre motion.html num Chromium sem tela, pede cada quadro com
   renderizar(t) e passa as imagens ao ffmpeg, que monta o MP4.
   Nada depende de relógio: o vídeo sai igual em qualquer máquina,
   por mais lenta que seja.

   Uso:
     node marketing/motion/renderizar.mjs                 vídeo inteiro
     node marketing/motion/renderizar.mjs --quadros 3,8.2  só esses instantes, em PNG
     node marketing/motion/renderizar.mjs --de 6 --ate 11  um trecho, para revisar

   Saída em marketing/motion/saida/. Precisa de ffmpeg no PATH e das
   telas já capturadas (capturar.mjs) e da logo em assets/marca/.
   ============================================================ */

import { createServer } from 'node:http';
import { once } from 'node:events';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const aqui = dirname(fileURLToPath(import.meta.url));
const SAIDA = resolve(aqui, 'saida');
const PW = process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright/index.js';

const { values: opcoes } = parseArgs({
  options: {
    quadros: { type: 'string' },
    de: { type: 'string' },
    ate: { type: 'string' },
    nome: { type: 'string', default: 'bancada-dsm' },
    crf: { type: 'string', default: '17' },
  },
});

/* Servidor estático só desta pasta: a página carrega telas, logo e
   manifesto pelo mesmo endereço, sem as restrições de file://. */
const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.css': 'text/css; charset=utf-8',
};
const servidor = createServer((req, res) => {
  const caminho = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const arquivo = resolve(aqui, `.${caminho}`);
  if (!arquivo.startsWith(aqui + sep)) { res.writeHead(403).end(); return; }
  try {
    if (!statSync(arquivo).isFile()) throw new Error('não é arquivo');
    res.writeHead(200, { 'content-type': TIPOS[extname(arquivo)] ?? 'application/octet-stream' });
    res.end(readFileSync(arquivo));
  } catch {
    res.writeHead(404).end();
  }
});
servidor.listen(0, '127.0.0.1');
await once(servidor, 'listening');
const endereco = `http://127.0.0.1:${servidor.address().port}/motion.html`;

const { default: playwright } = await import(PW);
const navegador = await playwright.chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
pagina.on('pageerror', (e) => console.error('erro na página:', e.message));
await pagina.goto(endereco);
await pagina.waitForFunction(() => window.pronto === true || window.erro, null, { timeout: 60_000 });
const erro = await pagina.evaluate(() => window.erro);
if (erro) throw new Error(`motion.html não ficou pronta: ${erro}`);

const FPS = await pagina.evaluate(() => window.FPS);
const DURACAO = await pagina.evaluate(() => window.DURACAO);
mkdirSync(SAIDA, { recursive: true });

async function quadro(t) {
  await pagina.evaluate((x) => window.renderizar(x), t);
  return pagina.screenshot({ type: 'png' });
}

try {
  if (opcoes.quadros) {
    const pasta = resolve(SAIDA, 'quadros');
    mkdirSync(pasta, { recursive: true });
    for (const t of opcoes.quadros.split(',').map(Number)) {
      const arquivo = resolve(pasta, `t-${t.toFixed(2).padStart(5, '0')}.png`);
      writeFileSync(arquivo, await quadro(t));
      console.log(arquivo);
    }
  } else {
    const de = Number(opcoes.de ?? 0);
    const ate = Math.min(Number(opcoes.ate ?? DURACAO), DURACAO);
    const primeiro = Math.round(de * FPS);
    const ultimo = Math.round(ate * FPS);          // exclusivo
    const trecho = opcoes.de || opcoes.ate ? `-${de}-${ate}` : '';
    const arquivo = resolve(SAIDA, `${opcoes.nome}${trecho}.mp4`);

    const ffmpeg = spawn('ffmpeg', [
      '-y', '-v', 'error',
      '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
      // RGB da tela para BT.709, que é o que player de vídeo HD assume.
      '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', opcoes.crf, '-profile:v', 'high',
      '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
      '-movflags', '+faststart',
      arquivo,
    ], { stdio: ['pipe', 'inherit', 'inherit'] });

    const inicio = Date.now();
    for (let i = primeiro; i < ultimo; i++) {
      const png = await quadro(i / FPS);
      if (!ffmpeg.stdin.write(png)) await once(ffmpeg.stdin, 'drain');
      if ((i - primeiro) % FPS === 0) {
        const feitos = i - primeiro;
        process.stdout.write(`\r${feitos}/${ultimo - primeiro} quadros · ${((Date.now() - inicio) / 1000).toFixed(0)} s`);
      }
    }
    ffmpeg.stdin.end();
    const [codigo] = await once(ffmpeg, 'close');
    if (codigo !== 0) throw new Error(`ffmpeg saiu com ${codigo}`);
    process.stdout.write(`\n${arquivo}\n`);
  }
} finally {
  await navegador.close();
  servidor.close();
}

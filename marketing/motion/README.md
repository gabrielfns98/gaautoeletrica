# Vídeo promocional do Bancada

Vídeo de 29,5 s (1920×1080, 30 fps, sem áudio) com a marca da DSM, que
distribui o sistema. A identidade segue o material comercial da DSM:
fundo claro, azul-marinho e verde-água, o fluxo em setas (recepção,
etiquetas, bancada, revisão, laudo), as matrizes e o fechamento com os
contatos.

As telas são do próprio sistema, fotografadas depois de cada ação de
verdade (protocolar um lote, ler o pH na bancada virtual, abrir o laudo
em PDF), com a massa de demonstração.

## O que fica fora do repositório

- `assets/telas/`: as telas capturadas e o `manifesto.js` com as caixas
  que o vídeo destaca. Saem de `capturar.mjs`.
- `assets/marca/`: as logos da DSM (`logo-dsm-cor-recorte.svg` e
  `logo-dsm-branco-recorte.svg`) e os contatos do fechamento
  (`contatos.js`, que define `window.CONTATOS` com `telefone`, `email` e
  `site`). São da DSM e o repositório é público.
- `saida/`: os vídeos e quadros gerados.

## Como gerar

```bash
# 1. sistema rodando, com a massa de demonstração
npx vite --host 127.0.0.1 --port 8080

# 2. telas (tema claro; --tema escuro para o outro)
node marketing/motion/capturar.mjs

# 3. vídeo inteiro em marketing/motion/saida/bancada-dsm.mp4
node marketing/motion/renderizar.mjs

# só alguns instantes, em PNG, para revisar
node marketing/motion/renderizar.mjs --quadros 3,8.2,15
```

Precisa de ffmpeg no PATH e do Playwright (a variável `PLAYWRIGHT_PATH`
aponta para outro, se for o caso).

`motion.html` também abre no navegador, servido desta pasta:
`?t=12.4` mostra um quadro, `?tocar` toca em tempo real.

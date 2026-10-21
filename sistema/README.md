# Sistema da oficina (vans)

MVP simples para uma oficina: fila de trabalho, entrada de vans, OS com histórico e
orçamento em PDF. Feito para uso no celular e no PC do balcão, por 1 a 3 pessoas.

Stack: Next.js (App Router) + TypeScript, Tailwind, Zod, @react-pdf/renderer,
**Vercel Blob** como armazenamento e login por **senha única**. Deploy na Vercel.

## Telas

| Rota                 | O que faz                                                        |
| -------------------- | ---------------------------------------------------------------- |
| `/login`             | Senha única da oficina                                            |
| `/`                  | Painel: fila ordenada, "Aguardando peça", "Prontas", busca        |
| `/nova`              | Nova entrada (busca a placa, cadastra van + cliente se for nova)  |
| `/os/[id]`           | Ficha da OS: diagnóstico, serviço, itens, dados do orçamento      |
| `/os/[id]/orcamento` | Preview do PDF, baixar e enviar por WhatsApp                      |
| `/van/[placa]`       | Histórico completo da van                                         |

A ordem da fila está em `lib/fila.ts` (função pura, com testes): fixada → urgente →
previsão de entrega mais próxima → entrada mais antiga.

## Como os dados são guardados

Tudo fica num único arquivo JSON (`oficina/dados.json`) dentro de um **Vercel Blob**
privado. Não há banco de dados. Para 1 oficina com 2-3 pessoas isso basta, com uma
ressalva honesta: se duas pessoas salvarem no mesmo instante, a última gravação vence.

Na sua máquina, sem o token do Blob, o sistema grava em `.dados-local.json` — assim dá
para testar com `npm run dev` sem tocar nos dados de produção.

## Variáveis de ambiente

```bash
cp .env.example .env.local
```

| Variável | Para que serve |
| --- | --- |
| `OFICINA_SENHA` | Senha única de acesso. Trocar aqui troca para todo mundo. |
| `SESSAO_SECRET` | Assina o cookie de sessão. Mudar o valor desloga todo mundo. |
| `BLOB_READ_WRITE_TOKEN` | Criado pela Vercel ao conectar a loja do Blob ao projeto. |

Para criar a loja do Blob e já conectá-la ao projeto:

```bash
npx vercel blob create-store oficina --access private --region gru1 --yes
```

## Rodar e publicar

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # testes de lib/fila.ts e dos totais do orçamento
npx vercel --prod    # publica
```

Para trocar a senha depois: Vercel → projeto → Settings → Environment Variables →
`OFICINA_SENHA` → editar → redeploy.

## Personalizar a oficina

- **Dados, cores e condições**: `lib/oficina.ts` (nome, CNPJ, endereço, telefone,
  WhatsApp, e-mail, Instagram, PIX, cor primária e o texto padrão de condições de
  pagamento e garantia). `instagram` ou `pix` como `""` somem do PDF.
- **Logo**: troque `public/logo.png` (PNG com fundo transparente, ~600×200 px). O
  arquivo atual é um placeholder.
- **Fontes do PDF**: `public/fonts/Roboto-*.ttf`, embutidas para acentos e `R$`.

Não há tela de configuração: tudo isso é arquivo.

## Valores

Todo dinheiro é `Int` em **centavos**. A formatação em `R$` acontece só na UI e no PDF
(`lib/format.ts`).

## Como esta versão foi publicada (21/10/2026)

O deploy de produção foi feito enviando os arquivos direto para a API da Vercel
(projeto `ghcconsultoria10/sistema`), porque a integração GitHub da conta Vercel não
enxerga este repositório. Nessa cópia publicada:

- os arquivos `.ts`/`.tsx` foram compactados (espaços removidos) e os tipos retirados,
  então o build roda com `typescript.ignoreBuildErrors` — **o código legível e checado
  por tipos é este repositório**;
- `public/fonts` e `public/logo.png` não foram enviados, então o PDF usa a Helvetica
  interna (acentos e `R$` conferidos) e o cabeçalho mostra o nome da oficina em texto.

Para voltar ao fluxo normal (deploy a cada push), instale o app da Vercel no GitHub
em https://github.com/apps/vercel/installations/select_target e ligue o projeto a este
repositório, com Root Directory `sistema`.

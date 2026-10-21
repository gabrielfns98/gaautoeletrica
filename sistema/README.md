# Sistema da oficina (vans)

MVP simples para uma oficina: fila de trabalho, entrada de vans, OS com histórico e
orçamento em PDF. Feito para uso no celular e no PC do balcão, por 1 a 3 pessoas.

Stack: Next.js (App Router) + TypeScript, Prisma, Supabase (Postgres + Auth), Tailwind,
Zod, @react-pdf/renderer. Deploy na Vercel.

## Telas

| Rota                 | O que faz                                                        |
| -------------------- | ---------------------------------------------------------------- |
| `/`                  | Painel: fila ordenada, "Aguardando peça", "Prontas", busca        |
| `/nova`              | Nova entrada (busca a placa, cadastra van + cliente se for nova)  |
| `/os/[id]`           | Ficha da OS: diagnóstico, serviço, itens, dados do orçamento      |
| `/os/[id]/orcamento` | Preview do PDF, baixar e enviar por WhatsApp                      |
| `/van/[placa]`       | Histórico completo da van                                         |

A ordem da fila está em `lib/fila.ts` (função pura, com testes): fixada → urgente →
previsão de entrega mais próxima → entrada mais antiga.

## Como rodar

### 1. Criar o projeto no Supabase

1. https://supabase.com → **New project**. Guarde a senha do banco.
2. **Project Settings → Database → Connection string**: copie a string do *pooler*
   (porta 6543) para `DATABASE_URL` e a conexão direta (porta 5432) para `DIRECT_URL`.
3. **Project Settings → API**: copie a *Project URL* e a *anon key*.
4. **Authentication → Users → Add user**: crie o(s) usuário(s) com e-mail e senha
   (marque "Auto Confirm User"). Não existe tela de cadastro: só login.
5. Em **Authentication → Providers**, deixe apenas e-mail/senha ligado.

### 2. Variáveis de ambiente

```bash
cp .env.example .env.local   # e preencha com os dados do passo 1
```

### 3. Instalar, migrar e popular

```bash
npm install
npm run db:migrate   # cria as tabelas (usa DIRECT_URL)
npm run seed         # dados fictícios para testar
npm run dev          # http://localhost:3000
```

`npm run seed` apaga e recria os dados de exemplo — **não rode em produção**.

### 4. Deploy na Vercel

1. Importe o repositório na Vercel.
2. Em **Root Directory**, escolha `sistema` (este diretório).
3. Em **Environment Variables**, cole as quatro variáveis do `.env.example`.
4. Deploy. O build roda `prisma generate && next build`.
5. Para aplicar as migrations em produção: `npx prisma migrate deploy` com o
   `DIRECT_URL` apontando para o banco do Supabase.

## Personalizar a oficina

- **Dados, cores e condições**: edite `lib/oficina.ts` (nome, CNPJ, endereço, telefone,
  WhatsApp, e-mail, Instagram, PIX, cor primária e o texto padrão de condições de
  pagamento e garantia). Deixe `instagram` ou `pix` como `""` para esconder do PDF.
- **Logo**: troque `public/logo.png` por outro PNG (fundo transparente, algo como
  600×200 px). O arquivo atual é um placeholder.
- **Fontes do PDF**: `public/fonts/Roboto-Regular.ttf` e `Roboto-Bold.ttf`, embutidas
  para que acentos e `R$` saiam corretos. Para trocar, substitua os dois arquivos e
  ajuste `lib/pdf/registrarFontes.ts`.

Não há tela de configuração: tudo isso é arquivo.

## Testes

```bash
npm test   # lib/fila.ts e cálculo de totais do orçamento
```

## Valores

Todo dinheiro é `Int` em **centavos** no banco. A formatação em `R$` acontece só na UI
e no PDF (`lib/format.ts`).

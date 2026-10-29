# Ligar a Bancada ao banco

A Bancada roda em dois modos. O padrão é **demonstração**: massa gerada em
memória, nada persiste, serve para mostrar o sistema. O modo **banco** lê e
grava no Supabase, exige login e é o que o laboratório usa.

O modo é explícito. Sem `VITE_BANCADA_BACKEND=supabase` a aplicação nunca
tenta falar com o banco — e, no modo banco, uma falha de conexão **não** cai
em demonstração: aparece erro. Analista digitando resultado no vazio é pior
que tela de erro.

## 1. Aplicar a migração

No projeto Supabase, SQL Editor, rode o conteúdo de
`supabase/migrations/20251008120000_bancada_lims.sql`. Ele cria 29 tabelas
`lab_*`, os tipos, as políticas de RLS, os gatilhos (trilha de auditoria,
bloqueio de calibração vencida, saldo de estoque) e os sete papéis de fábrica.

Para conferir depois:

```sql
select count(*) from pg_tables where tablename like 'lab\_%';  -- 29
select nome from public.lab_papeis order by nome;              -- 7 papéis
```

## 2. Criar a primeira conta e o vínculo

A conta de autenticação sozinha não abre nada: toda política de RLS passa por
`lab_eh_membro()`, que exige uma linha em `lab_membros` apontando para o
`auth.users.id`.

1. Authentication → Users → Add user (e-mail e senha).
2. No SQL Editor, com o `id` dessa conta:

```sql
insert into public.lab_unidades (codigo, sigla, nome, cnpj, municipio, uf, responsavel_tecnico)
values ('13', 'LEM/BA', 'Laboratório Solos & Plantas', '00.000.000/0001-00',
        'Luís Eduardo Magalhães', 'BA', 'Nome do RT')
returning id;

insert into public.lab_membros (user_id, papel_id, nome, email, cargo)
values ('<auth.users.id>',
        (select id from public.lab_papeis where nome = 'Administrador'),
        'Nome', 'email@laboratorio.com.br', 'Administração')
returning id;

insert into public.lab_membros_unidades (membro_id, unidade_id)
values ('<lab_membros.id>', '<lab_unidades.id>');
```

Sem unidade vinculada o membro entra, mas não enxerga amostra alguma: as
políticas filtram por unidade.

## 3. Cadastrar grupos e parâmetros

Amostra exige grupo (`lab_grupos_analise`), e resultado exige parâmetro
(`lab_parametros`). O importador casa a coluna da planilha com o **código** do
parâmetro — `PH-H2O`, `PH-CACL2`, `MO`, `P-MEL`, `K` —, então o código no banco
precisa ser o mesmo que o laboratório usa na planilha.

Parâmetro de pH leva `eh_ph = true` e `extrator` preenchido; a restrição
`lab_parametros_ph_exige_extrator` recusa sem.

## 4. Apontar a aplicação

Variáveis de build (na Vercel: Project → Settings → Environment Variables):

| variável | valor |
| --- | --- |
| `VITE_BANCADA_BACKEND` | `supabase` |
| `VITE_SUPABASE_URL` | URL do projeto |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | chave anon (`anon`, publicável) |

São lidas no build, não em tempo de execução: mudou variável, precisa de um
novo deploy.

## O que já persiste

A cadeia analítica: unidades, papéis, membros, grupos, parâmetros, tabelas de
preço, clientes, lotes de recepção, amostras, ensaios, equipamentos,
calibrações e leituras de pH. Em termos de tela: recepção, importação de
amostras e de resultados, lançamento, revisão, aprovação, bancada de pH e
calibração.

## O que ainda não persiste

Laudos, orçamentos, financeiro, fiscal, estoque, CRM além do cadastro de
cliente, curvas, legendas e os demais cadastros. No modo banco esses módulos
aparecem **vazios**, de propósito: misturar massa de demonstração com dado real
do laboratório seria pior que mostrar módulo vazio.

## Como o mapeamento é conferido

`src/lims/data/mapas.ts` traduz linha do banco para domínio, e
`src/lims/data/esquema.test.ts` lê o SQL da migração e cobra que toda coluna
citada exista e que nenhuma coluna obrigatória das tabelas em que a aplicação
insere fique de fora:

```
npx tsx src/lims/data/esquema.test.ts
```

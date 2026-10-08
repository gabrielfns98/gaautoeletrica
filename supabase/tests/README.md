# Testes do esquema Bancada

`bancada_rls.test.sql` exercita, contra um Postgres de verdade, as regras que
não podem depender só da interface:

| # | O que verifica |
|---|---|
| T01 | Recepção consegue protocolar lote e amostra |
| T02 | Analista **não** consegue criar amostra (RLS) |
| T03 | Analista abre ensaio e enxerga o catálogo de parâmetros |
| T04 | Leitura com calibração reprovada é recusada |
| T05 | Leitura fora da validade da calibração é recusada |
| T06 | pH fora de 0–14 é recusado |
| T07 | Analista não aprova o próprio resultado (ISO/IEC 17025 7.8.1) |
| T08 | Responsável técnico aprova e a data é carimbada |
| T09 | A transição de status gera auditoria automática |
| T10 | Amostra só é visível para quem opera aquela unidade |
| T11 | Saída maior que o saldo é recusada |
| T12 | Saldo do estoque acompanha o movimento |
| T13 | Papel só aceita permissões do vocabulário |
| T14 | Nota autorizada exige protocolo da prefeitura |

## Como rodar

Contra um Supabase local (`supabase start`):

```sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 --single-transaction \
  -f supabase/tests/bancada_rls.test.sql
```

Contra um Postgres avulso, crie antes o que o Supabase fornece pronto —
o schema `auth`, a tabela `auth.users`, a função `auth.uid()` e o papel
`authenticated`:

```sql
create schema if not exists auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text);
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create role authenticated nologin;
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;
create extension if not exists pgcrypto;
```

Depois aplique `migrations/20251008120000_bancada_lims.sql` e rode o teste.
O script precisa de um banco limpo: ele insere as próprias fixtures e
termina imprimindo `TODOS OS TESTES DE RLS/REGRAS PASSARAM`.

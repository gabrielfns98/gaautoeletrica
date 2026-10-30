-- ============================================================
-- BANCADA — registro das importações
-- Duas perguntas que um laboratório acreditado precisa responder:
-- de onde veio este resultado, e esta planilha já entrou antes?
-- Sem registro, a primeira não tem resposta e a segunda vira
-- "acho que não".
-- ============================================================

create table public.lab_importacoes (
  id uuid primary key default gen_random_uuid(),
  arquivo text not null,
  -- SHA-256 do conteúdo lido, em hexadecimal
  hash text not null,
  fluxo text not null check (fluxo in ('amostras', 'resultados')),
  linhas integer not null default 0 check (linhas >= 0),
  gravados integer not null default 0 check (gravados >= 0),
  usuario_id uuid references public.lab_membros(id) on delete set null,
  unidade_id uuid not null references public.lab_unidades(id) on delete restrict,
  data timestamptz not null default now(),
  -- o operador foi avisado da repetição e seguiu assim mesmo
  reimportacao boolean not null default false
);

-- Sem unicidade de propósito: subir o mesmo arquivo duas vezes é um fato,
-- e a trilha tem de registrar os dois eventos. O índice serve para a tela
-- reconhecer a repetição e avisar antes de gravar.
create index lab_importacoes_hash_idx on public.lab_importacoes (hash, fluxo);
create index lab_importacoes_data_idx on public.lab_importacoes (data desc);

create table public.lab_importacoes_ensaios (
  importacao_id uuid not null references public.lab_importacoes(id) on delete cascade,
  ensaio_id uuid not null references public.lab_ensaios(id) on delete cascade,
  valor numeric not null,
  primary key (importacao_id, ensaio_id)
);

create index lab_importacoes_ensaios_ensaio_idx
  on public.lab_importacoes_ensaios (ensaio_id);

select public.lab_aplica_rls(tabela, 'amostras')
from (values ('lab_importacoes'), ('lab_importacoes_ensaios')) as t(tabela);

-- Quem lança resultado precisa registrar a importação, mesmo sem o módulo
-- de amostras; e qualquer membro precisa ler para rastrear um resultado.
do $$
declare t text;
begin
  foreach t in array array['lab_importacoes', 'lab_importacoes_ensaios'] loop
    execute format('drop policy %I on public.%I', t || '_sel', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.lab_eh_membro())',
      t || '_sel', t);
    execute format('drop policy %I on public.%I', t || '_ins', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.lab_pode(%L) or public.lab_pode(%L))',
      t || '_ins', t, 'amostras:criar', 'analises:editar');
  end loop;
end $$;

-- Importação não se edita: o registro é do que aconteceu.
drop policy lab_importacoes_upd on public.lab_importacoes;
drop policy lab_importacoes_ensaios_upd on public.lab_importacoes_ensaios;

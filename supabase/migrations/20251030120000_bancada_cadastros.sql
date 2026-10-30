-- ============================================================
-- BANCADA — cadastros de referência
-- O miolo configurável do laboratório: o que muda de cliente
-- para cliente e não pode viver no código. A escrita pertence ao
-- módulo de configurações; a leitura precisa alcançar todo mundo,
-- porque sem curva, legenda e pacote de análise o analista não
-- interpreta um resultado sequer.
-- ============================================================

-- ------------------------------------------------------------
-- Pacotes vendidos: Análise → Tipo de Análise → Elemento
-- ------------------------------------------------------------

create table public.lab_tipos_analise (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nome text not null,
  grupo_id text not null references public.lab_grupos_analise(id) on delete restrict,
  prazo_dias integer not null default 7 check (prazo_dias > 0),
  -- vazio soma o preço dos elementos que compõem o pacote
  preco numeric(12,2) check (preco is null or preco >= 0),
  ativo boolean not null default true
);

create table public.lab_tipos_analise_parametros (
  tipo_id uuid not null references public.lab_tipos_analise(id) on delete cascade,
  parametro_id uuid not null references public.lab_parametros(id) on delete restrict,
  ordem smallint not null default 0,
  primary key (tipo_id, parametro_id)
);

-- A amostra passa a registrar o pacote contratado.
alter table public.lab_amostras
  add column tipo_analise_id uuid references public.lab_tipos_analise(id) on delete set null;

-- ------------------------------------------------------------
-- Curvas analíticas
-- ------------------------------------------------------------

create table public.lab_curvas (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nome text not null,
  parametro_id uuid not null references public.lab_parametros(id) on delete restrict,
  equipamento_id uuid references public.lab_equipamentos(id) on delete set null,
  tipo_ajuste text not null default 'linear'
    check (tipo_ajuste in ('linear', 'linear-sem-intercepto')),
  -- [{concentracao, leitura, descartado}]
  pontos jsonb not null default '[]',
  coef_angular numeric(16,8) not null,
  coef_linear numeric(16,8) not null default 0,
  r2 numeric(8,6) not null check (r2 between 0 and 1),
  -- limite de detecção e de quantificação, na unidade do parâmetro
  lod numeric(16,6) check (lod is null or lod >= 0),
  loq numeric(16,6) check (loq is null or loq >= 0),
  diluicao numeric(10,4) not null default 1 check (diluicao > 0),
  analista_id uuid references public.lab_membros(id) on delete set null,
  data timestamptz not null default now(),
  valida_ate timestamptz not null,
  ativa boolean not null default true,
  observacao text,
  constraint lab_curvas_min_pontos check (jsonb_array_length(pontos) >= 2),
  constraint lab_curvas_loq_acima_lod check (lod is null or loq is null or loq >= lod)
);

create index lab_curvas_parametro_idx on public.lab_curvas (parametro_id, data desc);

-- ------------------------------------------------------------
-- Legendas de interpretação
-- ------------------------------------------------------------

create table public.lab_legendas (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nome text not null,
  parametro_id uuid not null references public.lab_parametros(id) on delete cascade,
  -- preenchida, a legenda só vale para esta cultura
  cultura text,
  fonte text not null,
  -- [{de, ate, rotulo, descricao, severidade}]
  faixas jsonb not null default '[]',
  padrao boolean not null default false,
  ativa boolean not null default true,
  constraint lab_legendas_min_faixas check (jsonb_array_length(faixas) >= 1)
);

create index lab_legendas_parametro_idx on public.lab_legendas (parametro_id);

-- Uma única legenda padrão por parâmetro e cultura.
create unique index lab_legendas_padrao_idx
  on public.lab_legendas (parametro_id, coalesce(cultura, ''))
  where padrao;

-- ------------------------------------------------------------
-- Metodologias, bandejas e listas simples
-- ------------------------------------------------------------

create table public.lab_metodologias (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nome text not null,
  norma text not null,
  versao text not null default '1',
  vigente_desde date not null default current_date,
  ativa boolean not null default true
);

create table public.lab_bandejas (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nome text not null,
  linhas smallint not null check (linhas > 0),
  colunas smallint not null check (colunas > 0),
  setor text,
  ativa boolean not null default true
);

-- Listas de uma coluna só: profundidade, cultura, tipo de cliente e as
-- observações fixas do laudo. Uma tabela com espécie evita quatro tabelas
-- idênticas e o mesmo CRUD repetido quatro vezes.
create table public.lab_itens_cadastro (
  id uuid primary key default gen_random_uuid(),
  especie text not null
    check (especie in ('profundidade', 'cultura', 'tipo-cliente', 'observacao-fixa')),
  codigo text not null,
  nome text not null,
  ativo boolean not null default true,
  observacao text,
  unique (especie, codigo)
);

create table public.lab_convenios (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nome text not null,
  ativo boolean not null default true,
  observacao text,
  tabela_preco_id uuid references public.lab_tabelas_preco(id) on delete set null,
  desconto numeric(5,2) not null default 0 check (desconto between 0 and 100),
  valido_ate date
);

create table public.lab_regras_desconto (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nome text not null,
  ativo boolean not null default true,
  observacao text,
  quantidade_minima integer not null check (quantidade_minima > 0),
  percentual numeric(5,2) not null check (percentual between 0 and 100)
);

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------

select public.lab_aplica_rls(tabela, 'configuracoes')
from (values
  ('lab_tipos_analise'),
  ('lab_tipos_analise_parametros'),
  ('lab_curvas'),
  ('lab_legendas'),
  ('lab_metodologias'),
  ('lab_bandejas'),
  ('lab_itens_cadastro'),
  ('lab_convenios'),
  ('lab_regras_desconto')
) as t(tabela);

-- Escrever é de configurações; ler é de todo membro. Um analista sem
-- permissão de configurações ainda precisa da curva para calcular e da
-- legenda para interpretar.
do $$
declare t text;
begin
  foreach t in array array[
    'lab_tipos_analise','lab_tipos_analise_parametros','lab_curvas','lab_legendas',
    'lab_metodologias','lab_bandejas','lab_itens_cadastro','lab_convenios',
    'lab_regras_desconto'
  ] loop
    execute format('drop policy %I on public.%I', t || '_sel', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.lab_eh_membro())',
      t || '_sel', t);
  end loop;
end $$;

-- A função de auditoria lia old.status direto, então só podia ser pendurada
-- em tabela que tivesse essa coluna: em qualquer outra o insert falhava com
-- "record old has no field status". Lendo via to_jsonb ela serve a qualquer
-- tabela, e o texto continua idêntico para ensaio, laudo e nota.
create or replace function public.lab_registra_auditoria()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  antes text;
  depois text;
  detalhe text;
begin
  antes := case when tg_op = 'INSERT' then null else to_jsonb(old) ->> 'status' end;
  depois := to_jsonb(new) ->> 'status';
  detalhe := case
    when depois is null then tg_op
    else format('status %s → %s', coalesce(antes, '—'), depois)
  end;

  insert into public.lab_auditoria (usuario_id, acao, entidade, entidade_id, detalhe)
  values (public.lab_membro_atual(), tg_op, tg_table_name, new.id::text, detalhe);

  return new;
end;
$$;

-- Curva e legenda entram na trilha de auditoria como o resto do processo.
create trigger lab_curvas_auditoria
  after insert or update on public.lab_curvas
  for each row execute function public.lab_registra_auditoria();

create trigger lab_legendas_auditoria
  after insert or update on public.lab_legendas
  for each row execute function public.lab_registra_auditoria();

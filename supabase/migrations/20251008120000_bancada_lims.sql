-- ============================================================
-- BANCADA — Sistema de Gestão Laboratorial
-- Esquema multiempresa para laboratório de análises
-- agroindustriais, com o módulo de potenciometria (pH) no centro.
--
-- Todas as tabelas levam o prefixo lab_ para conviver com o
-- esquema já existente da aplicação.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- Tipos
-- ------------------------------------------------------------

create type lab_status_amostra as enum (
  'recebida', 'preparo', 'em-analise', 'aguardando-revisao', 'liberada', 'cancelada'
);
create type lab_prioridade as enum ('normal', 'urgente', 'emergencial');
create type lab_status_ensaio as enum (
  'pendente', 'em-bancada', 'lido', 'revisado', 'aprovado', 'repetir'
);
create type lab_origem_leitura as enum ('instrumento', 'manual', 'importacao');
create type lab_extrator as enum ('H2O', 'CaCl2', 'KCl', 'SMP', 'direto');
create type lab_status_calibracao as enum ('valida', 'vencida', 'reprovada');
create type lab_resultado_cq as enum ('aprovado', 'alerta', 'reprovado');
create type lab_status_laudo as enum ('rascunho', 'aguardando-assinatura', 'emitido', 'cancelado');
create type lab_tipo_titulo as enum ('receber', 'pagar');
create type lab_status_titulo as enum ('aberto', 'pago', 'vencido', 'parcial', 'cancelado');
create type lab_status_nota as enum (
  'rascunho', 'em-processamento', 'autorizada', 'rejeitada', 'cancelada'
);
create type lab_tipo_movimento as enum ('entrada', 'saida', 'ajuste', 'descarte');
create type lab_estagio_funil as enum (
  'lead', 'contato', 'proposta', 'negociacao', 'ganho', 'perdido'
);

-- ------------------------------------------------------------
-- Organização e controle de acesso
-- ------------------------------------------------------------

create table public.lab_unidades (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  sigla text not null,
  nome text not null,
  cnpj text not null,
  municipio text not null,
  uf char(2) not null,
  responsavel_tecnico text not null,
  crq text,
  acreditacao text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- Vocabulário de permissões. Como CHECK não aceita subconsulta, a lista
-- fica numa função IMMUTABLE, reaproveitada pela restrição e pelos seeds.
create or replace function public.lab_modulos()
returns text[] language sql immutable as $$
  select array['dashboard','recepcao','amostras','ph','analises','laudos','crm',
               'financeiro','fiscal','estoque','equipamentos','usuarios',
               'configuracoes','auditoria']
$$;

create or replace function public.lab_acoes()
returns text[] language sql immutable as $$
  select array['ver','criar','editar','excluir','aprovar','exportar']
$$;

create or replace function public.lab_permissoes_validas()
returns text[] language sql immutable as $$
  select array(
    select m || ':' || a
    from unnest(public.lab_modulos()) m
    cross join unnest(public.lab_acoes()) a
  )
$$;

-- Papel = conjunto de permissões no formato 'modulo:acao'.
create table public.lab_papeis (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  descricao text,
  sistema boolean not null default false,
  cor text not null default '172 66% 46%',
  permissoes text[] not null default '{}',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint lab_papeis_permissoes_formato
    check (permissoes <@ public.lab_permissoes_validas())
);

-- Vínculo entre a conta de autenticação e o laboratório.
create table public.lab_membros (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  papel_id uuid not null references public.lab_papeis(id) on delete restrict,
  nome text not null,
  email text not null,
  cargo text,
  ativo boolean not null default true,
  mfa boolean not null default false,
  -- grupos de análise que o analista está habilitado a assinar
  habilitacoes text[] not null default '{}',
  ultimo_acesso timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- Um membro pode operar mais de uma unidade.
create table public.lab_membros_unidades (
  membro_id uuid not null references public.lab_membros(id) on delete cascade,
  unidade_id uuid not null references public.lab_unidades(id) on delete cascade,
  primary key (membro_id, unidade_id)
);

-- ------------------------------------------------------------
-- Funções de autorização
-- ------------------------------------------------------------

-- Permissões efetivas do usuário. SECURITY DEFINER para que a
-- própria policy não dispare RLS recursivo em lab_membros.
create or replace function public.lab_permissoes(_user_id uuid)
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(p.permissoes, '{}')
  from public.lab_membros m
  join public.lab_papeis p on p.id = m.papel_id
  where m.user_id = _user_id and m.ativo
$$;

create or replace function public.lab_tem(_user_id uuid, _permissao text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select _permissao = any (public.lab_permissoes(_user_id))
$$;

-- Açúcar para as policies: avalia sobre o usuário da requisição.
create or replace function public.lab_pode(_permissao text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.lab_tem(auth.uid(), _permissao)
$$;

-- Qualquer membro ativo do laboratório, independentemente do papel.
create or replace function public.lab_eh_membro()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.lab_membros where user_id = auth.uid() and ativo
  )
$$;

create or replace function public.lab_membro_atual()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.lab_membros where user_id = auth.uid() and ativo
$$;

-- Unidades que o usuário enxerga. Sem vínculo explícito, nenhuma.
create or replace function public.lab_unidades_do_usuario(_user_id uuid)
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select mu.unidade_id
  from public.lab_membros m
  join public.lab_membros_unidades mu on mu.membro_id = m.id
  where m.user_id = _user_id and m.ativo
$$;

create or replace function public.lab_ve_unidade(_unidade_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select _unidade_id in (select public.lab_unidades_do_usuario(auth.uid()))
$$;

-- ------------------------------------------------------------
-- Catálogo de ensaios
-- ------------------------------------------------------------

create table public.lab_grupos_analise (
  id text primary key,
  nome text not null,
  abreviacao text not null,
  descricao text,
  prazo_padrao_dias integer not null default 7 check (prazo_padrao_dias > 0),
  tem_ph boolean not null default false,
  ativo boolean not null default true
);

create table public.lab_parametros (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nome text not null,
  grupo_id text not null references public.lab_grupos_analise(id) on delete restrict,
  unidade_medida text not null default '',
  metodo text not null,
  casas_decimais smallint not null default 2 check (casas_decimais between 0 and 6),
  limite_inferior numeric,
  limite_superior numeric,
  incerteza numeric check (incerteza is null or incerteza >= 0),
  preco numeric(12,2) not null default 0 check (preco >= 0),
  ativo boolean not null default true,
  -- marca os parâmetros resolvidos pela estação de potenciometria
  eh_ph boolean not null default false,
  extrator lab_extrator,
  proporcao text,
  constraint lab_parametros_faixa
    check (limite_inferior is null or limite_superior is null or limite_inferior < limite_superior),
  constraint lab_parametros_ph_exige_extrator
    check (not eh_ph or extrator is not null)
);

-- ------------------------------------------------------------
-- Clientes e CRM
-- ------------------------------------------------------------

create table public.lab_tabelas_preco (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  desconto numeric(5,2) not null default 0 check (desconto between 0 and 100),
  ativa boolean not null default true
);

create table public.lab_clientes (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nome text not null,
  nome_fantasia text,
  tipo char(2) not null default 'PJ' check (tipo in ('PJ', 'PF')),
  documento text not null,
  inscricao_estadual text,
  email text,
  telefone text,
  cep text,
  logradouro text,
  municipio text not null,
  uf char(2) not null,
  segmento text,
  consultor_id uuid references public.lab_membros(id) on delete set null,
  tabela_preco_id uuid references public.lab_tabelas_preco(id) on delete set null,
  limite_credito numeric(14,2) not null default 0,
  condicao_pagamento text,
  ativo boolean not null default true,
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table public.lab_contatos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.lab_clientes(id) on delete cascade,
  nome text not null,
  cargo text,
  email text,
  telefone text,
  principal boolean not null default false
);

create table public.lab_oportunidades (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  cliente_id uuid not null references public.lab_clientes(id) on delete cascade,
  estagio lab_estagio_funil not null default 'lead',
  valor numeric(14,2) not null default 0 check (valor >= 0),
  probabilidade smallint not null default 0 check (probabilidade between 0 and 100),
  previsao_fechamento date,
  responsavel_id uuid references public.lab_membros(id) on delete set null,
  origem text,
  notas text,
  criada_em timestamptz not null default now(),
  ultima_interacao timestamptz not null default now()
);

create table public.lab_interacoes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.lab_clientes(id) on delete cascade,
  oportunidade_id uuid references public.lab_oportunidades(id) on delete set null,
  tipo text not null check (tipo in ('ligacao','email','visita','whatsapp','reuniao')),
  resumo text not null,
  data timestamptz not null default now(),
  autor_id uuid references public.lab_membros(id) on delete set null
);

-- ------------------------------------------------------------
-- Recepção e amostras
-- ------------------------------------------------------------

create table public.lab_lotes_recepcao (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique,
  cliente_id uuid not null references public.lab_clientes(id) on delete restrict,
  unidade_id uuid not null references public.lab_unidades(id) on delete restrict,
  data_recepcao timestamptz not null default now(),
  recebido_por_id uuid references public.lab_membros(id) on delete set null,
  quantidade_amostras integer not null check (quantidade_amostras > 0),
  nota_fiscal_remessa text,
  transportadora text,
  observacoes text
);

create table public.lab_amostras (
  id uuid primary key default gen_random_uuid(),
  protocolo text not null unique,
  lote_recepcao_id uuid not null references public.lab_lotes_recepcao(id) on delete cascade,
  cliente_id uuid not null references public.lab_clientes(id) on delete restrict,
  grupo_id text not null references public.lab_grupos_analise(id) on delete restrict,
  unidade_id uuid not null references public.lab_unidades(id) on delete restrict,
  identificacao_campo text not null,
  fazenda text,
  talhao text,
  profundidade text,
  cultura text,
  data_coleta date,
  data_recepcao timestamptz not null default now(),
  prazo_entrega timestamptz not null,
  status lab_status_amostra not null default 'recebida',
  prioridade lab_prioridade not null default 'normal',
  massa_recebida numeric check (massa_recebida is null or massa_recebida > 0),
  temperatura_recebimento numeric,
  conforme_no_recebimento boolean not null default true,
  nao_conformidade text,
  posicao_bandeja text,
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint lab_amostras_nc_descrita
    check (conforme_no_recebimento or nao_conformidade is not null)
);

create index lab_amostras_status_idx on public.lab_amostras (status);
create index lab_amostras_cliente_idx on public.lab_amostras (cliente_id);
create index lab_amostras_unidade_idx on public.lab_amostras (unidade_id);
create index lab_amostras_prazo_idx on public.lab_amostras (prazo_entrega)
  where status not in ('liberada', 'cancelada');

-- ------------------------------------------------------------
-- Equipamentos e metrologia
-- ------------------------------------------------------------

create table public.lab_equipamentos (
  id uuid primary key default gen_random_uuid(),
  tag text not null unique,
  nome text not null,
  fabricante text,
  modelo text,
  numero_serie text,
  tipo text not null check (tipo in ('phmetro','balanca','estufa','espectrofotometro','agitador','outro')),
  unidade_id uuid not null references public.lab_unidades(id) on delete restrict,
  setor text,
  protocolo text check (protocolo in ('generico-ascii','mettler','hanna','digimed','tecnal')),
  baud_rate integer,
  ativo boolean not null default true,
  data_aquisicao date,
  proxima_manutencao date,
  eletrodo_modelo text,
  eletrodo_serie text,
  eletrodo_instalado_em date,
  eletrodo_vida_util_meses smallint
);

create table public.lab_calibracoes (
  id uuid primary key default gen_random_uuid(),
  equipamento_id uuid not null references public.lab_equipamentos(id) on delete cascade,
  analista_id uuid references public.lab_membros(id) on delete set null,
  data timestamptz not null default now(),
  -- [{tampao, mV, temperatura, lote}]
  pontos jsonb not null,
  slope_percentual numeric(6,3) not null,
  slope_mv_por_ph numeric(8,4) not null check (slope_mv_por_ph > 0),
  offset_mv numeric(8,3) not null,
  r2 numeric(8,6) not null check (r2 between 0 and 1),
  status lab_status_calibracao not null,
  valida_ate timestamptz not null,
  observacao text,
  constraint lab_calibracoes_min_pontos check (jsonb_array_length(pontos) >= 2)
);

create index lab_calibracoes_equip_data_idx
  on public.lab_calibracoes (equipamento_id, data desc);

-- ------------------------------------------------------------
-- Ensaios e leituras de pH
-- ------------------------------------------------------------

create table public.lab_ensaios (
  id uuid primary key default gen_random_uuid(),
  amostra_id uuid not null references public.lab_amostras(id) on delete cascade,
  parametro_id uuid not null references public.lab_parametros(id) on delete restrict,
  status lab_status_ensaio not null default 'pendente',
  valor numeric,
  valor_texto text,
  unidade_medida text not null default '',
  analista_id uuid references public.lab_membros(id) on delete set null,
  revisor_id uuid references public.lab_membros(id) on delete set null,
  data_leitura timestamptz,
  data_aprovacao timestamptz,
  leitura_ph_id uuid,
  fora_de_faixa boolean not null default false,
  observacao text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (amostra_id, parametro_id),
  -- segregação de funções: quem leu não pode ser quem aprovou
  constraint lab_ensaios_segregacao
    check (revisor_id is null or analista_id is null or revisor_id <> analista_id),
  constraint lab_ensaios_aprovado_tem_revisor
    check (status <> 'aprovado' or revisor_id is not null)
);

create index lab_ensaios_amostra_idx on public.lab_ensaios (amostra_id);
create index lab_ensaios_status_idx on public.lab_ensaios (status);
create index lab_ensaios_fila_ph_idx on public.lab_ensaios (parametro_id)
  where status in ('pendente', 'em-bancada', 'repetir');

create table public.lab_leituras_ph (
  id uuid primary key default gen_random_uuid(),
  ensaio_id uuid not null references public.lab_ensaios(id) on delete cascade,
  amostra_id uuid not null references public.lab_amostras(id) on delete cascade,
  parametro_id uuid not null references public.lab_parametros(id) on delete restrict,
  equipamento_id uuid not null references public.lab_equipamentos(id) on delete restrict,
  calibracao_id uuid not null references public.lab_calibracoes(id) on delete restrict,
  analista_id uuid references public.lab_membros(id) on delete set null,
  origem lab_origem_leitura not null,
  mv numeric(10,4) not null,
  temperatura numeric(6,2) not null check (temperatura between -5 and 110),
  ph_bruto numeric(6,3) not null check (ph_bruto between 0 and 14),
  ph_corrigido numeric(6,3) not null check (ph_corrigido between 0 and 14),
  deriva_mv_por_min numeric(8,3) not null default 0 check (deriva_mv_por_min >= 0),
  estavel boolean not null default false,
  tempo_estabilizacao_s integer not null default 0 check (tempo_estabilizacao_s >= 0),
  extrator lab_extrator not null,
  proporcao text,
  data_hora timestamptz not null default now(),
  -- amostragem bruta do instrumento: [{t, mV, ph, temperatura}]
  trace jsonb,
  replica_de uuid references public.lab_leituras_ph(id) on delete set null,
  observacao text
);

create index lab_leituras_ph_ensaio_idx on public.lab_leituras_ph (ensaio_id);
create index lab_leituras_ph_data_idx on public.lab_leituras_ph (data_hora desc);
create index lab_leituras_ph_equip_idx on public.lab_leituras_ph (equipamento_id, data_hora desc);

alter table public.lab_ensaios
  add constraint lab_ensaios_leitura_fk
  foreign key (leitura_ph_id) references public.lab_leituras_ph(id) on delete set null;

-- ------------------------------------------------------------
-- Controle de qualidade
-- ------------------------------------------------------------

create table public.lab_amostras_controle (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo text not null check (tipo in ('mrc','controle-interno','branco','duplicata')),
  valor_alvo numeric(8,3) not null,
  desvio_padrao numeric(8,4) not null check (desvio_padrao > 0),
  lote text,
  validade date,
  grupo_id text references public.lab_grupos_analise(id) on delete set null
);

create table public.lab_registros_cq (
  id uuid primary key default gen_random_uuid(),
  controle_id uuid not null references public.lab_amostras_controle(id) on delete cascade,
  equipamento_id uuid references public.lab_equipamentos(id) on delete set null,
  analista_id uuid references public.lab_membros(id) on delete set null,
  data timestamptz not null default now(),
  valor_medido numeric(8,3) not null,
  z_score numeric(8,3) not null,
  resultado lab_resultado_cq not null,
  regra_violada text
);

create index lab_registros_cq_controle_data_idx
  on public.lab_registros_cq (controle_id, data);

-- ------------------------------------------------------------
-- Laudos
-- ------------------------------------------------------------

create table public.lab_laudos (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique,
  cliente_id uuid not null references public.lab_clientes(id) on delete restrict,
  grupo_id text references public.lab_grupos_analise(id) on delete set null,
  status lab_status_laudo not null default 'rascunho',
  emitido_em timestamptz,
  assinado_por_id uuid references public.lab_membros(id) on delete set null,
  versao smallint not null default 1 check (versao >= 1),
  hash_documento text,
  enviado_email boolean not null default false,
  observacoes text,
  criado_em timestamptz not null default now(),
  constraint lab_laudos_emitido_assinado
    check (status <> 'emitido' or (assinado_por_id is not null and emitido_em is not null))
);

create table public.lab_laudos_amostras (
  laudo_id uuid not null references public.lab_laudos(id) on delete cascade,
  amostra_id uuid not null references public.lab_amostras(id) on delete cascade,
  primary key (laudo_id, amostra_id)
);

-- ------------------------------------------------------------
-- Comercial, financeiro e fiscal
-- ------------------------------------------------------------

create table public.lab_orcamentos (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique,
  cliente_id uuid not null references public.lab_clientes(id) on delete restrict,
  oportunidade_id uuid references public.lab_oportunidades(id) on delete set null,
  status text not null default 'rascunho'
    check (status in ('rascunho','enviado','aprovado','recusado','expirado')),
  emitido_em timestamptz not null default now(),
  valido_ate date,
  itens jsonb not null default '[]',
  desconto numeric(5,2) not null default 0 check (desconto between 0 and 100),
  total numeric(14,2) not null default 0 check (total >= 0),
  responsavel_id uuid references public.lab_membros(id) on delete set null
);

create table public.lab_notas_fiscais (
  id uuid primary key default gen_random_uuid(),
  modelo text not null default 'NFS-e' check (modelo in ('NFS-e','NF-e')),
  numero text not null,
  serie text not null default 'A1',
  cliente_id uuid not null references public.lab_clientes(id) on delete restrict,
  unidade_id uuid references public.lab_unidades(id) on delete set null,
  emissao timestamptz not null default now(),
  competencia char(7) not null,
  status lab_status_nota not null default 'rascunho',
  codigo_servico text not null,
  discriminacao text not null,
  valor_servicos numeric(14,2) not null check (valor_servicos >= 0),
  deducoes numeric(14,2) not null default 0 check (deducoes >= 0),
  base_calculo numeric(14,2) not null check (base_calculo >= 0),
  aliquota_iss numeric(5,2) not null check (aliquota_iss between 0 and 100),
  valor_iss numeric(14,2) not null default 0,
  iss_retido boolean not null default false,
  valor_ir numeric(14,2) not null default 0,
  valor_pis numeric(14,2) not null default 0,
  valor_cofins numeric(14,2) not null default 0,
  valor_csll numeric(14,2) not null default 0,
  valor_inss numeric(14,2) not null default 0,
  valor_liquido numeric(14,2) not null,
  chave_acesso char(44),
  protocolo_autorizacao text,
  motivo_rejeicao text,
  criado_em timestamptz not null default now(),
  unique (modelo, serie, numero),
  constraint lab_nf_autorizada_tem_protocolo
    check (status <> 'autorizada' or protocolo_autorizacao is not null),
  constraint lab_nf_rejeitada_tem_motivo
    check (status <> 'rejeitada' or motivo_rejeicao is not null)
);

create table public.lab_notas_laudos (
  nota_id uuid not null references public.lab_notas_fiscais(id) on delete cascade,
  laudo_id uuid not null references public.lab_laudos(id) on delete cascade,
  primary key (nota_id, laudo_id)
);

create table public.lab_titulos (
  id uuid primary key default gen_random_uuid(),
  tipo lab_tipo_titulo not null,
  numero text not null,
  cliente_id uuid references public.lab_clientes(id) on delete set null,
  fornecedor text,
  descricao text not null,
  categoria text not null,
  emissao date not null default current_date,
  vencimento date not null,
  pagamento date,
  valor numeric(14,2) not null check (valor >= 0),
  valor_pago numeric(14,2) not null default 0 check (valor_pago >= 0),
  status lab_status_titulo not null default 'aberto',
  forma_pagamento text check (forma_pagamento in ('boleto','pix','transferencia','cartao','dinheiro')),
  nota_fiscal_id uuid references public.lab_notas_fiscais(id) on delete set null,
  criado_em timestamptz not null default now(),
  constraint lab_titulos_pago_tem_data
    check (status <> 'pago' or pagamento is not null),
  constraint lab_titulos_receber_tem_cliente
    check (tipo <> 'receber' or cliente_id is not null)
);

create index lab_titulos_vencimento_idx on public.lab_titulos (tipo, vencimento)
  where status in ('aberto', 'vencido');

-- ------------------------------------------------------------
-- Estoque
-- ------------------------------------------------------------

create table public.lab_itens_estoque (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nome text not null,
  classe text not null check (classe in ('padrao','tampao','solvente','acido','base','vidraria','consumivel')),
  fabricante text,
  unidade_medida text not null,
  saldo numeric(12,3) not null default 0 check (saldo >= 0),
  estoque_minimo numeric(12,3) not null default 0 check (estoque_minimo >= 0),
  localizacao text,
  custo_unitario numeric(12,2) not null default 0 check (custo_unitario >= 0),
  controlado boolean not null default false
);

create table public.lab_lotes_reagente (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.lab_itens_estoque(id) on delete cascade,
  lote text not null,
  validade date not null,
  quantidade numeric(12,3) not null check (quantidade >= 0),
  certificado_url text,
  aberto boolean not null default false,
  aberto_em date,
  unique (item_id, lote)
);

create table public.lab_movimentos_estoque (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.lab_itens_estoque(id) on delete cascade,
  lote_id uuid references public.lab_lotes_reagente(id) on delete set null,
  tipo lab_tipo_movimento not null,
  quantidade numeric(12,3) not null check (quantidade > 0),
  data timestamptz not null default now(),
  usuario_id uuid references public.lab_membros(id) on delete set null,
  motivo text
);

-- ------------------------------------------------------------
-- Auditoria
-- ------------------------------------------------------------

create table public.lab_auditoria (
  id bigserial primary key,
  data timestamptz not null default now(),
  usuario_id uuid references public.lab_membros(id) on delete set null,
  acao text not null,
  entidade text not null,
  entidade_id text,
  detalhe text,
  ip inet
);

create index lab_auditoria_data_idx on public.lab_auditoria (data desc);
create index lab_auditoria_entidade_idx on public.lab_auditoria (entidade, entidade_id);

-- ------------------------------------------------------------
-- Gatilhos de integridade do processo
-- ------------------------------------------------------------

create or replace function public.lab_tocar_atualizado_em()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'lab_unidades','lab_papeis','lab_membros','lab_clientes','lab_amostras','lab_ensaios'
  ] loop
    execute format(
      'create trigger %I_tocar before update on public.%I
       for each row execute function public.lab_tocar_atualizado_em()', t, t);
  end loop;
end $$;

-- Uma leitura só vale se a calibração usada estava válida no momento.
create or replace function public.lab_valida_calibracao_da_leitura()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  c record;
begin
  select status, valida_ate, equipamento_id
    into c
  from public.lab_calibracoes
  where id = new.calibracao_id;

  if not found then
    raise exception 'Calibração % não encontrada.', new.calibracao_id;
  end if;
  if c.equipamento_id <> new.equipamento_id then
    raise exception 'A calibração informada pertence a outro equipamento.';
  end if;
  if c.status <> 'valida' then
    raise exception 'Calibração % está % — leitura sem rastreabilidade metrológica.',
      new.calibracao_id, c.status;
  end if;
  if new.data_hora > c.valida_ate then
    raise exception 'Calibração vencida em % — recalibre antes de registrar a leitura.',
      c.valida_ate;
  end if;

  return new;
end;
$$;

create trigger lab_leituras_ph_valida_calibracao
  before insert on public.lab_leituras_ph
  for each row execute function public.lab_valida_calibracao_da_leitura();

-- Aprovação exige segundo responsável e carimba a data.
create or replace function public.lab_aprova_ensaio()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'aprovado' and old.status is distinct from 'aprovado' then
    if new.revisor_id is null then
      raise exception 'Aprovação exige um revisor identificado.';
    end if;
    if new.revisor_id = new.analista_id then
      raise exception 'Segregação de funções: o analista não pode aprovar o próprio resultado.';
    end if;
    new.data_aprovacao = coalesce(new.data_aprovacao, now());
  end if;
  return new;
end;
$$;

create trigger lab_ensaios_aprova
  before update on public.lab_ensaios
  for each row execute function public.lab_aprova_ensaio();

-- Saldo do estoque acompanha os movimentos.
create or replace function public.lab_aplica_movimento_estoque()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  saldo_atual numeric;
begin
  select saldo into saldo_atual from public.lab_itens_estoque where id = new.item_id for update;

  if new.tipo = 'entrada' then
    update public.lab_itens_estoque
       set saldo = saldo + new.quantidade
     where id = new.item_id;
  else
    if saldo_atual < new.quantidade then
      raise exception 'Saldo insuficiente: disponível %, solicitado %.', saldo_atual, new.quantidade;
    end if;
    update public.lab_itens_estoque
       set saldo = saldo - new.quantidade
     where id = new.item_id;
  end if;

  return new;
end;
$$;

create trigger lab_movimentos_aplica
  after insert on public.lab_movimentos_estoque
  for each row execute function public.lab_aplica_movimento_estoque();

-- Trilha automática das operações sensíveis.
create or replace function public.lab_registra_auditoria()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  detalhe text;
begin
  detalhe := case tg_table_name
    when 'lab_ensaios' then format('status %s → %s', coalesce(old.status::text, '—'), new.status)
    when 'lab_laudos' then format('status %s → %s', coalesce(old.status::text, '—'), new.status)
    when 'lab_notas_fiscais' then format('status %s → %s', coalesce(old.status::text, '—'), new.status)
    else tg_op
  end;

  insert into public.lab_auditoria (usuario_id, acao, entidade, entidade_id, detalhe)
  values (public.lab_membro_atual(), tg_op, tg_table_name, new.id::text, detalhe);

  return new;
end;
$$;

create trigger lab_ensaios_auditoria
  after update of status on public.lab_ensaios
  for each row when (old.status is distinct from new.status)
  execute function public.lab_registra_auditoria();

create trigger lab_laudos_auditoria
  after update of status on public.lab_laudos
  for each row when (old.status is distinct from new.status)
  execute function public.lab_registra_auditoria();

create trigger lab_notas_auditoria
  after update of status on public.lab_notas_fiscais
  for each row when (old.status is distinct from new.status)
  execute function public.lab_registra_auditoria();

-- ------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------

-- Aplica o par de policies padrão (leitura / escrita) a cada tabela,
-- ligando-a ao módulo correspondente da matriz de permissões.
create or replace function public.lab_aplica_rls(_tabela text, _modulo text)
returns void
language plpgsql
as $$
begin
  execute format('alter table public.%I enable row level security', _tabela);
  execute format('alter table public.%I force row level security', _tabela);

  -- Sem GRANT a RLS nem chega a ser avaliada: o acesso para antes, no
  -- privilégio da tabela. Quem decide de fato é a policy abaixo.
  execute format(
    'grant select, insert, update, delete on public.%I to authenticated', _tabela);

  execute format(
    'create policy %I on public.%I for select to authenticated using (public.lab_pode(%L))',
    _tabela || '_sel', _tabela, _modulo || ':ver');

  execute format(
    'create policy %I on public.%I for insert to authenticated with check (public.lab_pode(%L))',
    _tabela || '_ins', _tabela, _modulo || ':criar');

  execute format(
    'create policy %I on public.%I for update to authenticated using (public.lab_pode(%L)) with check (public.lab_pode(%L))',
    _tabela || '_upd', _tabela, _modulo || ':editar', _modulo || ':editar');

  execute format(
    'create policy %I on public.%I for delete to authenticated using (public.lab_pode(%L))',
    _tabela || '_del', _tabela, _modulo || ':excluir');
end;
$$;

select public.lab_aplica_rls(t.tabela, t.modulo)
from (values
  ('lab_unidades',          'configuracoes'),
  ('lab_papeis',            'usuarios'),
  ('lab_membros',           'usuarios'),
  ('lab_membros_unidades',  'usuarios'),
  ('lab_grupos_analise',    'configuracoes'),
  ('lab_parametros',        'configuracoes'),
  ('lab_tabelas_preco',     'configuracoes'),
  ('lab_clientes',          'crm'),
  ('lab_contatos',          'crm'),
  ('lab_oportunidades',     'crm'),
  ('lab_interacoes',        'crm'),
  ('lab_orcamentos',        'crm'),
  ('lab_lotes_recepcao',    'recepcao'),
  ('lab_amostras',          'amostras'),
  ('lab_ensaios',           'analises'),
  ('lab_leituras_ph',       'ph'),
  ('lab_amostras_controle', 'ph'),
  ('lab_registros_cq',      'ph'),
  ('lab_equipamentos',      'equipamentos'),
  ('lab_calibracoes',       'equipamentos'),
  ('lab_laudos',            'laudos'),
  ('lab_laudos_amostras',   'laudos'),
  ('lab_notas_fiscais',     'fiscal'),
  ('lab_notas_laudos',      'fiscal'),
  ('lab_titulos',           'financeiro'),
  ('lab_itens_estoque',     'estoque'),
  ('lab_lotes_reagente',    'estoque'),
  ('lab_movimentos_estoque','estoque'),
  ('lab_auditoria',         'auditoria')
) as t(tabela, modulo);

-- Catálogo e cadastros de referência: escrita continua restrita ao módulo
-- de configurações, mas a LEITURA precisa alcançar todo mundo — sem o
-- catálogo de parâmetros o analista não consegue sequer abrir um ensaio.
do $$
declare t text;
begin
  foreach t in array array[
    'lab_unidades','lab_grupos_analise','lab_parametros','lab_tabelas_preco'
  ] loop
    execute format('drop policy %I on public.%I', t || '_sel', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.lab_eh_membro())',
      t || '_sel', t);
  end loop;
end $$;

-- A auditoria é registro permanente: ninguém edita nem apaga.
drop policy lab_auditoria_upd on public.lab_auditoria;
drop policy lab_auditoria_del on public.lab_auditoria;

-- Qualquer sessão autenticada pode gravar na trilha (os gatilhos gravam
-- em nome do usuário), mas só quem tem o módulo consegue ler.
drop policy lab_auditoria_ins on public.lab_auditoria;
create policy lab_auditoria_ins on public.lab_auditoria
  for insert to authenticated with check (true);

-- Todo membro enxerga o próprio cadastro, mesmo sem o módulo de usuários.
create policy lab_membros_proprio on public.lab_membros
  for select to authenticated using (user_id = auth.uid());

-- Aprovar um ensaio é ação própria, separada de editar.
create policy lab_ensaios_aprovar on public.lab_ensaios
  for update to authenticated
  using (public.lab_pode('analises:aprovar'))
  with check (public.lab_pode('analises:aprovar'));

-- Escopo por unidade nas tabelas que carregam unidade_id.
create policy lab_amostras_unidade on public.lab_amostras
  as restrictive for all to authenticated
  using (public.lab_ve_unidade(unidade_id))
  with check (public.lab_ve_unidade(unidade_id));

create policy lab_equipamentos_unidade on public.lab_equipamentos
  as restrictive for all to authenticated
  using (public.lab_ve_unidade(unidade_id))
  with check (public.lab_ve_unidade(unidade_id));

create policy lab_lotes_recepcao_unidade on public.lab_lotes_recepcao
  as restrictive for all to authenticated
  using (public.lab_ve_unidade(unidade_id))
  with check (public.lab_ve_unidade(unidade_id));

-- ------------------------------------------------------------
-- Papéis de fábrica
-- ------------------------------------------------------------

insert into public.lab_papeis (nome, descricao, sistema, cor, permissoes) values
  ('Administrador',
   'Acesso irrestrito, incluindo configuração fiscal e gestão de usuários.',
   true, '214 72% 55%',
   public.lab_permissoes_validas()),

  ('Responsável Técnico',
   'Aprova resultados e assina laudos.',
   true, '172 66% 46%',
   array['dashboard:ver','recepcao:ver','amostras:ver','amostras:editar','amostras:exportar',
         'ph:ver','ph:criar','ph:editar','ph:aprovar','ph:exportar',
         'analises:ver','analises:criar','analises:editar','analises:aprovar','analises:exportar',
         'laudos:ver','laudos:criar','laudos:editar','laudos:aprovar','laudos:exportar',
         'equipamentos:ver','equipamentos:criar','equipamentos:editar','equipamentos:aprovar',
         'estoque:ver','auditoria:ver','auditoria:exportar','configuracoes:ver']),

  ('Analista de bancada',
   'Executa ensaios e opera o potenciômetro. Não aprova resultado próprio.',
   true, '186 62% 45%',
   array['dashboard:ver','amostras:ver','ph:ver','ph:criar','ph:editar',
         'analises:ver','analises:criar','analises:editar','laudos:ver',
         'equipamentos:ver','equipamentos:criar',
         'estoque:ver','estoque:criar','estoque:editar']),

  ('Recepção de amostras',
   'Protocola lotes e confere conformidade na entrada.',
   true, '38 92% 55%',
   array['dashboard:ver','recepcao:ver','recepcao:criar','recepcao:editar','recepcao:exportar',
         'amostras:ver','amostras:criar','amostras:editar','analises:ver','crm:ver','laudos:ver']),

  ('Comercial',
   'Carteira de clientes, funil e propostas.',
   true, '280 56% 58%',
   array['dashboard:ver','crm:ver','crm:criar','crm:editar','crm:exportar',
         'amostras:ver','laudos:ver','laudos:exportar','financeiro:ver']),

  ('Financeiro',
   'Contas a receber e a pagar, emissão e acompanhamento de notas.',
   true, '152 58% 44%',
   array['dashboard:ver','financeiro:ver','financeiro:criar','financeiro:editar',
         'financeiro:excluir','financeiro:exportar',
         'fiscal:ver','fiscal:criar','fiscal:editar','fiscal:aprovar','fiscal:exportar',
         'crm:ver','estoque:ver']),

  ('Portal do cliente',
   'Acompanha as próprias amostras e baixa os laudos liberados.',
   true, '220 12% 55%',
   array['dashboard:ver','amostras:ver','laudos:ver','laudos:exportar']);

-- ------------------------------------------------------------
-- Grupos de análise do escopo atual
-- ------------------------------------------------------------

insert into public.lab_grupos_analise (id, nome, abreviacao, descricao, prazo_padrao_dias, tem_ph) values
  ('agua-efluentes',      'Água e Efluentes',          'ÁGU', 'Potabilidade, irrigação, efluente industrial e fertirrigação.', 7,  true),
  ('bromatologia',        'Bromatologia',              'BRO', 'Composição de forragens, silagens, rações e subprodutos.',      10, true),
  ('compostos-organicos', 'Compostos Orgânicos',       'CPO', 'Compostagem, vermicomposto e resíduos orgânicos.',              12, true),
  ('corretivos-agricolas','Corretivos Agrícolas',      'COR', 'Calcário, PRNT, poder de neutralização e reatividade.',         8,  true),
  ('cromatografia',       'Cromatografia',             'CRO', 'Resíduos de agrotóxicos por HPLC e GC-MS/MS.',                  15, false),
  ('derivados-cana',      'Derivados de Cana',         'DCA', 'Caldo, melaço, vinhaça, torta de filtro e açúcar.',             6,  true),
  ('fertilizantes',       'Fertilizantes',             'FER', 'Garantias de NPK, micronutrientes e granulometria.',            10, true),
  ('foliar',              'Foliar (Tecido Vegetal)',   'FOL', 'Estado nutricional por diagnose foliar.',                       8,  false),
  ('gesso',               'Gesso',                     'GES', 'Gesso agrícola: cálcio, enxofre e umidade.',                    8,  true),
  ('nematoides',          'Nematoides',                'NEM', 'Extração e contagem de fitonematoides em solo e raiz.',         7,  false),
  ('patologia',           'Patologia',                 'PAT', 'Fitopatologia: identificação de fungos e bactérias.',           12, false),
  ('produtos-biologicos', 'Produtos Biológicos',       'BIO', 'Contagem de UFC e pureza de inoculantes.',                      14, true),
  ('seiva',               'Seiva',                     'SEI', 'Análise de seiva para manejo nutricional em tempo real.',       4,  true),
  ('sementes',            'Sementes',                  'SEM', 'Germinação, vigor, pureza e tetrazólio.',                       20, false),
  ('solo',                'Solo',                      'SOL', 'Fertilidade completa, textura e acidez.',                       7,  true),
  ('terceirizadas',       'Terceirizadas',             'TER', 'Ensaios subcontratados a laboratórios parceiros.',              25, false);

-- ------------------------------------------------------------
-- Parâmetros de pH — o núcleo da operação
-- ------------------------------------------------------------

insert into public.lab_parametros
  (codigo, nome, grupo_id, unidade_medida, metodo, casas_decimais,
   limite_inferior, limite_superior, incerteza, preco, eh_ph, extrator, proporcao) values
  ('PH-H2O',   'pH em água',                 'solo', '', 'Embrapa 2017 — potenciometria, suspensão 1:2,5',        2, 3, 10,  0.08,  9.40, true, 'H2O',    '1:2,5'),
  ('PH-CACL2', 'pH em CaCl₂ 0,01 mol/L',     'solo', '', 'IAC Boletim 100 — potenciometria, suspensão 1:2,5',     2, 3,  9,  0.07, 10.20, true, 'CaCl2',  '1:2,5'),
  ('PH-SMP',   'Índice SMP',                 'solo', '', 'CFSEMG — tampão SMP para estimativa de H+Al',           2, 4,  7.5,0.06, 11.00, true, 'SMP',    '1:2,5'),
  ('PH-KCL',   'pH em KCl 1 mol/L',          'solo', '', 'Embrapa 2017 — potenciometria em KCl',                  2, 3, 10,  0.08, 10.20, true, 'KCl',    '1:2,5'),
  ('PH-AGUA',  'pH',                         'agua-efluentes', '', 'SMEWW 4500-H⁺ B — potenciometria direta',      2, 0, 14,  0.05, 22.00, true, 'direto', 'direto'),
  ('PH-COR',   'pH da suspensão',            'corretivos-agricolas', '', 'Potenciometria, suspensão 1:5',          2, 0, 14,  0.06, 14.00, true, 'H2O',    '1:5'),
  ('PH-FERT',  'pH em solução',              'fertilizantes', '', 'IN SDA 28/2007 — potenciometria 1:10',          2, 0, 14,  0.06, 16.00, true, 'H2O',    '1:10'),
  ('PH-COMP',  'pH do composto',             'compostos-organicos', '', 'IN SDA 28/2007 — potenciometria 1:10',    2, 0, 14,  0.07, 15.00, true, 'H2O',    '1:10'),
  ('PH-CANA',  'pH do caldo',                'derivados-cana', '', 'CONSECANA — potenciometria direta',            2, 0, 14,  0.04, 12.00, true, 'direto', 'direto'),
  ('PH-SEIVA', 'pH da seiva',                'seiva', '', 'Potenciometria direta em extrato de seiva',             2, 0, 14,  0.05, 13.00, true, 'direto', 'direto');

-- ------------------------------------------------------------
-- Materiais de controle da potenciometria
-- ------------------------------------------------------------

insert into public.lab_amostras_controle (nome, tipo, valor_alvo, desvio_padrao, lote, validade, grupo_id) values
  ('MRC Solo — pH 5,52',            'mrc',              5.520, 0.0500, 'IAG-2281', current_date + 210, 'solo'),
  ('MRC Solo alcalino — pH 7,41',   'mrc',              7.410, 0.0400, 'IAG-2284', current_date + 180, 'solo'),
  ('Controle interno água — pH 6,88','controle-interno', 6.880, 0.0300, 'CI-0912',  current_date + 64,  'agua-efluentes'),
  ('Branco de reagente',            'branco',           7.000, 0.0600, 'BR-0441',  current_date + 30,  'solo');

-- ------------------------------------------------------------
-- Comentários de documentação
-- ------------------------------------------------------------

comment on table public.lab_leituras_ph is
  'Leitura potenciométrica individual. Guarda mV bruto, temperatura, pH calculado pela calibração vigente e o pH normalizado para 25 °C, além do trace de estabilização para auditoria.';
comment on column public.lab_leituras_ph.trace is
  'Amostragem bruta do instrumento durante a estabilização: [{t, mV, ph, temperatura}].';
comment on column public.lab_calibracoes.slope_percentual is
  'Percentual do slope medido em relação ao slope nernstiano teórico na temperatura de calibração. Faixa aceita: 95% a 105%.';
comment on column public.lab_calibracoes.offset_mv is
  'Potencial de assimetria lido no ponto isopotencial (pH 7). Faixa aceita: ±30 mV.';
comment on constraint lab_ensaios_segregacao on public.lab_ensaios is
  'ISO/IEC 17025 7.8.1 — o analista que executou o ensaio não pode ser quem aprova o resultado.';

-- ------------------------------------------------------------
-- Privilégios complementares
-- ------------------------------------------------------------

grant usage on schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

grant execute on function
  public.lab_permissoes(uuid), public.lab_tem(uuid, text), public.lab_pode(text),
  public.lab_membro_atual(), public.lab_eh_membro(), public.lab_unidades_do_usuario(uuid),
  public.lab_ve_unidade(uuid), public.lab_modulos(), public.lab_acoes(),
  public.lab_permissoes_validas()
to authenticated;

-- A função que monta as policies é de administração do esquema.
revoke all on function public.lab_aplica_rls(text, text) from public;

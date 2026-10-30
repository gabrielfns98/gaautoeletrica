-- ============================================================
-- BANCADA — critérios de aceitação por ensaio
-- Eram constantes no código, e chamavam-se "critérios de pH".
-- Cada laboratório valida o próprio método: o RSD entre réplicas,
-- a diferença aceita entre duplicatas e os limites do eletrodo
-- são dele, não do sistema.
-- ============================================================

create table public.lab_criterios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  -- Sem alvo, vale para qualquer ensaio; com grupo ou elemento,
  -- vence o mais específico na hora de resolver.
  grupo_id text references public.lab_grupos_analise(id) on delete cascade,
  parametro_id uuid references public.lab_parametros(id) on delete cascade,
  -- critério de eletrodo não se aplica a espectrofotômetro
  somente_ph boolean not null default false,
  rsd_max_percentual numeric(6,3) not null check (rsd_max_percentual > 0),
  diferenca_max_percentual numeric(6,3) check (diferenca_max_percentual > 0),
  z_score_max numeric(5,2) check (z_score_max > 0),
  slope_min numeric(6,2) check (slope_min > 0),
  slope_max numeric(6,2) check (slope_max > 0),
  slope_alerta numeric(6,2),
  offset_max_mv numeric(6,2) check (offset_max_mv >= 0),
  r2_min numeric(8,6) check (r2_min between 0 and 1),
  deriva_max_mv_por_min numeric(6,3) check (deriva_max_mv_por_min >= 0),
  janela_estabilidade_s integer check (janela_estabilidade_s > 0),
  ativo boolean not null default true,
  constraint lab_criterios_slope_coerente
    check (slope_min is null or slope_max is null or slope_min < slope_max)
);

create index lab_criterios_alvo_idx on public.lab_criterios (grupo_id, parametro_id);

select public.lab_aplica_rls('lab_criterios', 'configuracoes');

-- Critério é regra de bancada: escrever é de configurações, ler é de
-- todo membro — o analista precisa saber o limite que o reprova.
drop policy lab_criterios_sel on public.lab_criterios;
create policy lab_criterios_sel on public.lab_criterios
  for select to authenticated using (public.lab_eh_membro());

create trigger lab_criterios_auditoria
  after insert or update on public.lab_criterios
  for each row execute function public.lab_registra_auditoria();

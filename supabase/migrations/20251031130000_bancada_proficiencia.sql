-- ============================================================
-- BANCADA — ensaio de proficiência (interlaboratorial)
--
-- O controle interno responde se a bancada está estável. Ele não
-- responde se ela está certa: um laboratório pode repetir o mesmo
-- erro com desvio padrão exemplar durante anos, e a carta de
-- Levey-Jennings fica impecável o tempo todo.
--
-- Quem responde isso é o programa interlaboratorial — PAQLF
-- (Embrapa), IAC e congêneres. A ISO/IEC 17025 (7.7.2) exige
-- participação, e estas tabelas são a evidência que o auditor pede.
-- ============================================================

create table public.lab_programas_proficiencia (
  id uuid primary key default gen_random_uuid(),
  codigo text not null check (length(trim(codigo)) > 0),
  nome text not null check (length(trim(nome)) > 0),
  organizador text not null,
  grupo_id text not null references public.lab_grupos_analise(id) on delete restrict,
  rodadas_por_ano smallint not null default 2 check (rodadas_por_ano > 0),
  ativo boolean not null default true,
  observacao text,
  constraint lab_programas_proficiencia_codigo_unico unique (codigo)
);

create table public.lab_rodadas_proficiencia (
  id uuid primary key default gen_random_uuid(),
  programa_id uuid not null
    references public.lab_programas_proficiencia(id) on delete cascade,
  codigo text not null check (length(trim(codigo)) > 0),
  data_recebimento date,
  prazo_envio date not null,
  data_envio date,
  data_avaliacao date,
  status text not null default 'inscrita'
    check (status in ('inscrita', 'recebida', 'enviada', 'avaliada', 'cancelada')),
  -- Quantos laboratórios participaram: o consenso vale pelo tamanho,
  -- e um valor designado tirado de seis participantes não sustenta
  -- a mesma conclusão que um tirado de oitenta.
  participantes integer check (participantes > 0),
  observacao text,
  constraint lab_rodadas_proficiencia_unica unique (programa_id, codigo),
  -- A avaliação chega depois do envio, que chega depois do
  -- recebimento. Datas fora de ordem são erro de digitação, e
  -- deixá-las entrar embaralha o histórico de tendência.
  constraint lab_rodadas_proficiencia_ordem_envio
    check (data_envio is null or data_recebimento is null or data_envio >= data_recebimento),
  constraint lab_rodadas_proficiencia_ordem_avaliacao
    check (data_avaliacao is null or data_envio is null or data_avaliacao >= data_envio),
  -- Rodada avaliada sem a data da avaliação não tem como entrar na
  -- série cronológica que detecta viés.
  constraint lab_rodadas_proficiencia_avaliada_tem_data
    check (status <> 'avaliada' or data_avaliacao is not null)
);

create index lab_rodadas_proficiencia_programa_idx
  on public.lab_rodadas_proficiencia (programa_id, data_recebimento desc);

create table public.lab_resultados_proficiencia (
  id uuid primary key default gen_random_uuid(),
  rodada_id uuid not null
    references public.lab_rodadas_proficiencia(id) on delete cascade,
  parametro_id uuid not null references public.lab_parametros(id) on delete restrict,
  -- o que o laboratório relatou ao organizador
  valor numeric(14, 4) not null,
  -- incerteza expandida declarada pelo laboratório, para o número En
  incerteza numeric(14, 4) check (incerteza >= 0),
  -- valor designado, do consenso; só existe depois da avaliação
  designado numeric(14, 4),
  -- desvio padrão para avaliação da proficiência (σ)
  desvio_alvo numeric(14, 4) check (desvio_alvo > 0),
  incerteza_designado numeric(14, 4) check (incerteza_designado >= 0),
  incerteza_expandida_designado numeric(14, 4) check (incerteza_expandida_designado >= 0),
  acao_corretiva text,
  constraint lab_resultados_proficiencia_unico unique (rodada_id, parametro_id),
  -- Designado sem σ não produz z: o resultado entraria na tela sem
  -- veredito e pareceria aprovado.
  constraint lab_resultados_proficiencia_designado_tem_sigma
    check ((designado is null) = (desvio_alvo is null))
);

create index lab_resultados_proficiencia_rodada_idx
  on public.lab_resultados_proficiencia (rodada_id, parametro_id);

-- Os escores (z, z', En) NÃO são colunas, de propósito. São função
-- do valor designado, e o organizador reemite relatório. Um z
-- gravado continuaria afirmando o que a própria conta já não
-- confirma, e o histórico de tendência passaria a discordar de si
-- mesmo. Derivar sempre custa nada e nunca mente.

select public.lab_aplica_rls('lab_programas_proficiencia', 'analises');
select public.lab_aplica_rls('lab_rodadas_proficiencia', 'analises');
select public.lab_aplica_rls('lab_resultados_proficiencia', 'analises');

-- Ler é de todo membro: o resultado de proficiência é o que diz à
-- bancada se pode confiar no próprio método.
drop policy lab_programas_proficiencia_sel on public.lab_programas_proficiencia;
create policy lab_programas_proficiencia_sel on public.lab_programas_proficiencia
  for select to authenticated using (public.lab_eh_membro());

drop policy lab_rodadas_proficiencia_sel on public.lab_rodadas_proficiencia;
create policy lab_rodadas_proficiencia_sel on public.lab_rodadas_proficiencia
  for select to authenticated using (public.lab_eh_membro());

drop policy lab_resultados_proficiencia_sel on public.lab_resultados_proficiencia;
create policy lab_resultados_proficiencia_sel on public.lab_resultados_proficiencia
  for select to authenticated using (public.lab_eh_membro());

-- Alterar um resultado já relatado ao organizador, ou a ação
-- corretiva que o justifica, é exatamente o que a auditoria precisa
-- enxergar.
create trigger lab_rodadas_proficiencia_auditoria
  after insert or update on public.lab_rodadas_proficiencia
  for each row execute function public.lab_registra_auditoria();

create trigger lab_resultados_proficiencia_auditoria
  after insert or update on public.lab_resultados_proficiencia
  for each row execute function public.lab_registra_auditoria();

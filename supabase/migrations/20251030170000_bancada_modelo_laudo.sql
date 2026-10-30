-- ============================================================
-- BANCADA — modelo do laudo
--
-- O laudo é o único artefato que sai do laboratório e vira documento
-- do cliente. Logotipo, cabeçalho, ordem e agrupamento dos ensaios,
-- quais observações entram e o cargo sob a assinatura: tudo isso é
-- identidade do laboratório, não escolha de quem escreveu a tela.
-- ============================================================

create table public.lab_modelos_laudo (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(trim(nome)) > 0),
  -- vale só para esta unidade, quando o grupo tem mais de um CNPJ
  unidade_id uuid references public.lab_unidades(id) on delete cascade,
  -- vale só para esta análise: laudo de água não se parece com o de solo
  grupo_id text references public.lab_grupos_analise(id) on delete cascade,
  logo_url text,
  cabecalho text,
  rodape text,
  -- Ordem dos ensaios no laudo. O que não estiver aqui sai depois, na
  -- ordem do cadastro: elemento novo no escopo não pode sumir do
  -- laudo por ninguém ter lembrado de incluí-lo no modelo.
  ordem_parametros uuid[] not null default '{}',
  agrupamento text not null default 'nenhum'
    check (agrupamento in ('nenhum', 'metodologia')),
  -- A forma do documento. O laboratório tem dois padrões próprios — o
  -- laudo analítico de fertilizante, com coluna de garantia, e o de
  -- tecido vegetal, com barra de suficiência por cultura — além do
  -- genérico, que serve solo e água.
  layout text not null default 'generico'
    check (layout in ('generico', 'analitico', 'foliar')),
  -- registro no MAPA, impresso no cabeçalho do laudo analítico
  registro_mapa text,
  -- selo do programa interlaboratorial, no laudo foliar
  selo text,
  mostrar_tabela_referencia boolean not null default false,
  fonte_referencia text,
  observacao_ids uuid[] not null default '{}',
  mostrar_incerteza boolean not null default true,
  mostrar_interpretacao boolean not null default true,
  mostrar_metodos boolean not null default true,
  cargo_assinatura text not null default 'Responsável técnico',
  disposicao_padrao text not null default 'amostra'
    check (disposicao_padrao in ('amostra', 'matriz')),
  ativo boolean not null default true,
  -- Dois modelos para o mesmo alvo seriam ambíguos: qual timbra?
  constraint lab_modelos_laudo_alvo_unico unique (unidade_id, grupo_id)
);

create index lab_modelos_laudo_alvo_idx
  on public.lab_modelos_laudo (ativo, unidade_id, grupo_id);

select public.lab_aplica_rls('lab_modelos_laudo', 'configuracoes');

-- Escrever é de configurações; ler é de todo membro, porque é o que
-- desenha o laudo que a bancada confere antes de assinar.
drop policy lab_modelos_laudo_sel on public.lab_modelos_laudo;
create policy lab_modelos_laudo_sel on public.lab_modelos_laudo
  for select to authenticated using (public.lab_eh_membro());

-- Mudar o timbre muda documento que já foi emitido com outro; a
-- alteração fica registrada com autor e data.
create trigger lab_modelos_laudo_auditoria
  after insert or update on public.lab_modelos_laudo
  for each row execute function public.lab_registra_auditoria();

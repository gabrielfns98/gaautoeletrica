-- ============================================================
-- BANCADA — tipo de equipamento, verificação metrológica e
-- modelo de importação
--
-- Até aqui só o potenciômetro tinha calibração acompanhada e
-- leitura bloqueada ao vencer. O espectrofotômetro, a absorção
-- atômica, a balança e a estufa geravam número sem ninguém
-- perguntar quando foram verificados — que é a primeira coisa que
-- uma auditoria da ISO/IEC 17025 olha.
--
-- O tipo deixa de ser união no código e vira cadastro: o
-- laboratório compra um ICP ou um analisador elementar sem avisar
-- o programador, e o aparelho novo entra com o mesmo controle.
-- ============================================================

create table public.lab_tipos_equipamento (
  -- Id textual, não uuid: 'phmetro' e 'espectrofotometro' já são as
  -- chaves que o código usa para filtrar, e trocá-las por uuid
  -- quebraria o histórico de equipamentos sem ganhar nada.
  id text primary key,
  codigo text not null unique,
  nome text not null,
  -- a grandeza bruta que o aparelho entrega: "absorbância", "mV"
  grandeza text not null default '',
  -- o resultado só existe passando por curva de calibração
  exige_curva boolean not null default false,
  verificacao text not null default 'nenhuma'
    check (verificacao in (
      'calibracao-multiponto', 'curva-analitica', 'massa-padrao',
      'padrao-de-verificacao', 'temperatura', 'nenhuma'
    )),
  periodicidade_dias integer not null default 0 check (periodicidade_dias >= 0),
  -- bloquear ou não é escolha do laboratório, tipo a tipo: estufa
  -- vencida atrasa um ensaio, espectro fora de calibração mente
  bloqueia_vencido boolean not null default false,
  protocolos text[] not null default '{}',
  ativo boolean not null default true,
  -- tipo que exige verificação precisa dizer de quanto em quanto tempo
  constraint lab_tipos_equipamento_periodicidade_coerente
    check (verificacao = 'nenhuma' or periodicidade_dias > 0)
);

select public.lab_aplica_rls('lab_tipos_equipamento', 'configuracoes');

-- Cadastro é de configurações para escrever; todo membro lê, porque a
-- bancada precisa saber o rito do aparelho que vai usar.
drop policy lab_tipos_equipamento_sel on public.lab_tipos_equipamento;
create policy lab_tipos_equipamento_sel on public.lab_tipos_equipamento
  for select to authenticated using (public.lab_eh_membro());

create trigger lab_tipos_equipamento_auditoria
  after insert or update on public.lab_tipos_equipamento
  for each row execute function public.lab_registra_auditoria();

-- ------------------------------------------------------------

create table public.lab_verificacoes_equipamento (
  id uuid primary key default gen_random_uuid(),
  equipamento_id uuid not null references public.lab_equipamentos(id) on delete cascade,
  forma text not null
    check (forma in (
      'calibracao-multiponto', 'curva-analitica', 'massa-padrao',
      'padrao-de-verificacao', 'temperatura', 'nenhuma'
    )),
  data timestamptz not null default now(),
  analista_id uuid not null references public.lab_membros(id),
  valor_nominal numeric(14,5),
  valor_medido numeric(14,5),
  erro_percentual numeric(10,4),
  r2 numeric(8,6) check (r2 is null or r2 between 0 and 1),
  resultado text not null check (resultado in ('aprovada', 'alerta', 'reprovada')),
  valida_ate timestamptz not null,
  observacao text,
  -- validade que começa antes da verificação não é validade
  constraint lab_verificacoes_validade_coerente check (valida_ate > data)
);

-- A consulta quente é "qual a última deste aparelho": o índice
-- desce por data para a primeira linha já ser a resposta.
create index lab_verificacoes_equipamento_idx
  on public.lab_verificacoes_equipamento (equipamento_id, data desc);

select public.lab_aplica_rls('lab_verificacoes_equipamento', 'equipamentos');

drop policy lab_verificacoes_equipamento_sel on public.lab_verificacoes_equipamento;
create policy lab_verificacoes_equipamento_sel on public.lab_verificacoes_equipamento
  for select to authenticated using (public.lab_eh_membro());

create trigger lab_verificacoes_equipamento_auditoria
  after insert or update on public.lab_verificacoes_equipamento
  for each row execute function public.lab_registra_auditoria();

-- ------------------------------------------------------------

create table public.lab_modelos_importacao (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  -- o modelo serve a um aparelho, a uma família inteira, ou a
  -- qualquer um; os dois alvos juntos seriam ambíguos
  equipamento_id uuid references public.lab_equipamentos(id) on delete cascade,
  tipo_equipamento_id text references public.lab_tipos_equipamento(id) on delete cascade,
  fluxo text not null check (fluxo in ('amostras', 'resultados')),
  separador text,
  linhas_ignoradas integer not null default 0 check (linhas_ignoradas >= 0),
  tem_cabecalho boolean not null default true,
  decimal_virgula boolean not null default true,
  -- Destino de cada coluna pelo título normalizado. Pelo título e não
  -- pelo índice porque o aparelho reordena colunas entre versões de
  -- firmware, e um modelo preso ao índice passa a ler o número errado
  -- em silêncio.
  por_titulo jsonb not null default '{}'::jsonb,
  -- só usado quando o arquivo não tem cabeçalho para casar
  por_indice jsonb,
  ativo boolean not null default true,
  criado_por_id uuid references public.lab_membros(id),
  data timestamptz not null default now(),
  constraint lab_modelos_importacao_alvo_unico
    check (equipamento_id is null or tipo_equipamento_id is null),
  -- sem cabeçalho e sem posições salvas o modelo não mapeia nada
  constraint lab_modelos_importacao_tem_mapa
    check (tem_cabecalho or por_indice is not null)
);

create index lab_modelos_importacao_alvo_idx
  on public.lab_modelos_importacao (fluxo, equipamento_id, tipo_equipamento_id);

select public.lab_aplica_rls('lab_modelos_importacao', 'configuracoes');

-- Quem importa é a bancada, então ler é de todo membro; salvar
-- modelo é de configurações, como todo cadastro.
drop policy lab_modelos_importacao_sel on public.lab_modelos_importacao;
create policy lab_modelos_importacao_sel on public.lab_modelos_importacao
  for select to authenticated using (public.lab_eh_membro());

create trigger lab_modelos_importacao_auditoria
  after insert or update on public.lab_modelos_importacao
  for each row execute function public.lab_registra_auditoria();

-- ------------------------------------------------------------
-- O tipo do equipamento passa a referenciar o cadastro. A coluna já
-- existe como texto livre, e os ids do cadastro são os mesmos valores
-- que ela guarda hoje, então a chave estrangeira entra sem conversão.
-- ------------------------------------------------------------

insert into public.lab_tipos_equipamento
  (id, codigo, nome, grandeza, exige_curva, verificacao, periodicidade_dias, bloqueia_vencido, protocolos)
values
  ('phmetro', 'PHM', 'Potenciômetro (pHmetro)', 'pH e mV', false, 'calibracao-multiponto', 1, true, '{mettler,digimed,hanna,tecnal,generico-ascii}'),
  ('espectrofotometro', 'ESP', 'Espectrofotômetro UV-Vis', 'absorbância', true, 'curva-analitica', 30, true, '{generico-ascii,thermo}'),
  ('absorcao-atomica', 'AA', 'Absorção atômica', 'absorbância', true, 'curva-analitica', 30, true, '{generico-ascii,agilent,perkinelmer}'),
  ('icp-oes', 'ICP', 'ICP-OES / MP-AES', 'intensidade', true, 'curva-analitica', 30, true, '{generico-ascii,agilent}'),
  ('fotometro-chama', 'FTC', 'Fotômetro de chama', 'intensidade', true, 'curva-analitica', 7, true, '{generico-ascii,digimed}'),
  ('balanca', 'BAL', 'Balança analítica', 'massa (g)', false, 'massa-padrao', 1, true, '{mettler,shimadzu,generico-ascii}'),
  ('destilador-n', 'DEN', 'Destilador de nitrogênio', 'volume titulado (mL)', false, 'padrao-de-verificacao', 30, true, '{}'),
  ('analisador-elementar', 'ANE', 'Analisador elementar CHNS', '% em massa', true, 'padrao-de-verificacao', 15, true, '{generico-ascii}'),
  ('estufa', 'EST', 'Estufa de secagem', 'temperatura (°C)', false, 'temperatura', 90, false, '{}'),
  ('agitador', 'AGI', 'Agitador / mesa orbital', '—', false, 'nenhuma', 0, false, '{}')
on conflict (id) do nothing;

-- Equipamento de tipo desconhecido vira 'outro' antes da restrição
-- entrar, para a migração não falhar numa base já em uso.
insert into public.lab_tipos_equipamento (id, codigo, nome, verificacao, periodicidade_dias)
values ('outro', 'OUT', 'Outro', 'nenhuma', 0)
on conflict (id) do nothing;

-- O CHECK original prendia o tipo a seis valores escritos no código.
-- Ele é o que impediria o laboratório de cadastrar o ICP que acabou de
-- comprar, então sai: quem passa a mandar é o cadastro, pela chave
-- estrangeira abaixo — que restringe igual, mas a uma lista que o
-- próprio laboratório edita.
alter table public.lab_equipamentos
  drop constraint if exists lab_equipamentos_tipo_check;

update public.lab_equipamentos
   set tipo = 'outro'
 where tipo not in (select id from public.lab_tipos_equipamento);

alter table public.lab_equipamentos
  add constraint lab_equipamentos_tipo_fk
  foreign key (tipo) references public.lab_tipos_equipamento(id);

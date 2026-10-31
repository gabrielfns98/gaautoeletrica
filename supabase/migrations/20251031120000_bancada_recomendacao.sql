-- ============================================================
-- BANCADA — recomendação de calagem e adubação
--
-- O laudo diz o que o solo tem. O cliente mandou a amostra para
-- saber o que fazer com ele, e entre as duas coisas existe uma
-- tabela de referência que varia por estado, por cultura e por
-- quem publicou — CFSEMG em Minas, Boletim 100 em São Paulo,
-- curva SMP no Sul, neutralização do alumínio no Cerrado.
--
-- Nada disso pode ser constante de código: a mesma amostra
-- recomendada por duas tabelas dá duas doses, e as duas estão
-- certas na sua região. Então a tabela é cadastro, o laudo cita
-- qual usou, e o laboratório edita sem chamar o programador.
-- ============================================================

create table public.lab_tabelas_recomendacao (
  id uuid primary key default gen_random_uuid(),
  codigo text not null check (length(trim(codigo)) > 0),
  nome text not null check (length(trim(nome)) > 0),
  -- estado ou região a que a publicação se aplica: 'MG', 'RS/SC'
  regiao text not null,
  -- a publicação, por extenso: o anexo a cita, e sem citar a
  -- recomendação não é auditável
  fonte text not null,
  metodo_calagem text not null
    check (metodo_calagem in ('saturacao-bases', 'neutralizacao-al', 'smp')),
  -- Profundidade de incorporação que a dose publicada pressupõe.
  -- Incorporar mais fundo é corrigir mais solo, e exige
  -- proporcionalmente mais corretivo.
  profundidade_incorporacao numeric(4, 1) not null default 20
    check (profundidade_incorporacao > 0),
  -- Só no método SMP: a dose se lê numa curva tabulada, não sai de
  -- equação. Guardada como json porque é a tabela da publicação,
  -- lida inteira e nunca consultada por ponto.
  pontos_smp jsonb,
  padrao boolean not null default false,
  ativa boolean not null default true,
  constraint lab_tabelas_recomendacao_codigo_unico unique (codigo),
  -- Método SMP sem curva não recomenda nada: o banco recusa a
  -- tabela incompleta em vez de deixar a tela descobrir na hora.
  constraint lab_tabelas_recomendacao_smp_tem_curva
    check (metodo_calagem <> 'smp' or pontos_smp is not null)
);

create index lab_tabelas_recomendacao_regiao_idx
  on public.lab_tabelas_recomendacao (ativa, regiao);

create table public.lab_recomendacoes_cultura (
  id uuid primary key default gen_random_uuid(),
  tabela_id uuid not null
    references public.lab_tabelas_recomendacao(id) on delete cascade,
  -- código da cultura no cadastro de itens
  cultura text not null check (length(trim(cultura)) > 0),
  -- alvo do método da saturação por bases
  saturacao_desejada numeric(4, 1) check (saturacao_desejada between 0 and 100),
  -- alvos do método do alumínio
  ca_mg_desejado numeric(5, 2) check (ca_mg_desejado >= 0),
  fator_aluminio numeric(4, 2) check (fator_aluminio >= 0),
  -- alvo do método SMP
  ph_alvo numeric(3, 1) check (ph_alvo between 4 and 8),
  -- produtividade a que as doses abaixo se referem
  produtividade_referencia numeric(7, 2) check (produtividade_referencia > 0),
  unidade_produtividade text,
  -- kg/ha de N. Zero é recomendação de verdade, não ausência: a
  -- soja fixa o próprio nitrogênio, e "não aplique N" é o que o
  -- agrônomo precisa ler.
  nitrogenio numeric(7, 2) check (nitrogenio >= 0),
  -- Doses por classe de teor no solo, como a publicação tabela.
  -- São escadas curtas lidas inteiras, por isso json e não tabela
  -- filha: nenhuma consulta procura uma classe isolada.
  fosforo jsonb not null default '[]',
  potassio jsonb not null default '[]',
  observacao text,
  ativa boolean not null default true,
  -- Duas recomendações para a mesma cultura na mesma tabela seriam
  -- ambíguas: qual dose sai no anexo?
  constraint lab_recomendacoes_cultura_unica unique (tabela_id, cultura),
  -- Cada método exige o seu alvo. Sem isto a recomendação é
  -- aceita, some do anexo e ninguém sabe por quê.
  constraint lab_recomendacoes_cultura_tem_alvo check (
    saturacao_desejada is not null
    or (ca_mg_desejado is not null and fator_aluminio is not null)
    or ph_alvo is not null
  )
);

create index lab_recomendacoes_cultura_tabela_idx
  on public.lab_recomendacoes_cultura (tabela_id, ativa, cultura);

-- Produtividade esperada do talhão. Não é dado analítico: é o que o
-- produtor planeja colher, e é o que escala as doses de P e K — a
-- mesma análise para 60 ou para 90 sacas pede adubação diferente.
alter table public.lab_amostras
  add column produtividade_esperada numeric(7, 2)
    check (produtividade_esperada > 0);

select public.lab_aplica_rls('lab_tabelas_recomendacao', 'configuracoes');
select public.lab_aplica_rls('lab_recomendacoes_cultura', 'configuracoes');

-- Escrever a tabela de referência é de configurações; ler é de todo
-- membro, porque é o que desenha o anexo que acompanha o laudo.
drop policy lab_tabelas_recomendacao_sel on public.lab_tabelas_recomendacao;
create policy lab_tabelas_recomendacao_sel on public.lab_tabelas_recomendacao
  for select to authenticated using (public.lab_eh_membro());

drop policy lab_recomendacoes_cultura_sel on public.lab_recomendacoes_cultura;
create policy lab_recomendacoes_cultura_sel on public.lab_recomendacoes_cultura
  for select to authenticated using (public.lab_eh_membro());

-- Mudar o alvo de uma cultura muda toda recomendação emitida depois.
-- Quem mudou e quando fica registrado.
create trigger lab_tabelas_recomendacao_auditoria
  after insert or update on public.lab_tabelas_recomendacao
  for each row execute function public.lab_registra_auditoria();

create trigger lab_recomendacoes_cultura_auditoria
  after insert or update on public.lab_recomendacoes_cultura
  for each row execute function public.lab_registra_auditoria();

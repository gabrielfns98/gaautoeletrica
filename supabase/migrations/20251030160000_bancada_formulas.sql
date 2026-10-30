-- ============================================================
-- BANCADA — fórmulas dos resultados calculados
--
-- SB, CTC, V%, m%, H+Al pelo SMP, PRNT, NDT: cada um é uma conta
-- sobre os outros resultados da mesma amostra, e cada laboratório
-- — às vezes cada estado — usa equação diferente. A CFSEMG estima
-- H+Al por uma exponencial do índice SMP; o IAC usa tabela; quem
-- trabalha solo arenoso corrige o coeficiente. Com a conta cravada
-- no código, todo laboratório que não usa a de Minas depende de um
-- programador para fechar um laudo.
--
-- A expressão é interpretada pela aplicação, nunca por `eval`: o
-- texto vem daqui, e `eval` daria a quem edita o cadastro o direito
-- de rodar código na sessão de quem abre o laudo.
-- ============================================================

create table public.lab_formulas (
  id uuid primary key default gen_random_uuid(),
  parametro_id uuid not null references public.lab_parametros(id) on delete cascade,
  -- "CA + MG + K / 391 + NA"; as variáveis são códigos de elemento
  expressao text not null check (length(trim(expressao)) > 0),
  -- de onde a equação veio, para o laudo poder citar a referência
  fonte text,
  -- sem grupo a fórmula vale para o parâmetro em qualquer análise;
  -- com grupo, vence a mais específica
  grupo_id text references public.lab_grupos_analise(id) on delete cascade,
  ativa boolean not null default true,
  observacao text,
  -- Duas fórmulas ativas para o mesmo alvo e o mesmo grupo seriam
  -- ambíguas: qual delas fecha o laudo?
  constraint lab_formulas_alvo_unico unique (parametro_id, grupo_id)
);

create index lab_formulas_parametro_idx on public.lab_formulas (parametro_id, ativa);

select public.lab_aplica_rls('lab_formulas', 'configuracoes');

-- Escrever é de configurações, como todo cadastro. Ler é de todo
-- membro: a fórmula é o que explica o número que a bancada vê.
drop policy lab_formulas_sel on public.lab_formulas;
create policy lab_formulas_sel on public.lab_formulas
  for select to authenticated using (public.lab_eh_membro());

-- Mudar a equação muda resultado de laudo já emitido, então a
-- alteração precisa ficar registrada com autor e data.
create trigger lab_formulas_auditoria
  after insert or update on public.lab_formulas
  for each row execute function public.lab_registra_auditoria();

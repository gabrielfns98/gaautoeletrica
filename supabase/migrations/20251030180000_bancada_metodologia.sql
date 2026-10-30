-- ============================================================
-- BANCADA — metodologia como cadastro completo
--
-- O método é o registro central do ciclo de uma análise: o elemento
-- aponta para ele, e com isso o código sai sempre escrito do mesmo
-- jeito. Nos laudos emitidos hoje a mesma norma aparece como
-- "IN SDA CAP. 1 C 1.3", "IN SDA CAP. I C 2" e "IN CAP. 1 C 11.2" —
-- três grafias para um método só, porque cada uma foi digitada.
-- ============================================================

alter table public.lab_metodologias
  -- extração ou digestão que o método emprega
  add column if not exists extrator text,
  -- família de equipamento que executa o ensaio
  add column if not exists tipo_equipamento_id text
    references public.lab_tipos_equipamento(id) on delete set null,
  add column if not exists unidade text,
  add column if not exists casas_decimais smallint
    check (casas_decimais is null or casas_decimais between 0 and 6),
  -- limite de quantificação: abaixo dele o laudo imprime "< LQ"
  add column if not exists lq numeric(14,6) check (lq is null or lq > 0),
  add column if not exists incerteza numeric(14,6)
    check (incerteza is null or incerteza >= 0);

-- ------------------------------------------------------------
-- O elemento aponta para o método, e ganha o próprio LQ — que é o
-- que separa "0,00" de "< 0,10" no laudo — e a marca de relação,
-- para C/N e as relações foliares saírem sem unidade.
-- ------------------------------------------------------------

alter table public.lab_parametros
  add column if not exists metodologia_id uuid
    references public.lab_metodologias(id) on delete set null,
  add column if not exists lq numeric(14,6) check (lq is null or lq > 0),
  add column if not exists eh_relacao boolean not null default false;

-- Relação é adimensional: unidade preenchida nela seria o "%" que
-- os laudos atuais imprimem na C/N.
alter table public.lab_parametros
  add constraint lab_parametros_relacao_sem_unidade
  check (not eh_relacao or coalesce(unidade_medida, '') = '');

-- ------------------------------------------------------------
-- A garantia do fabricante é do lote analisado, não do método: o
-- mesmo N total tem garantia diferente a cada produto. Por isso ela
-- mora no ensaio.
-- ------------------------------------------------------------

alter table public.lab_ensaios
  add column if not exists garantia text;

-- Campos do produto que o laudo analítico imprime.
alter table public.lab_amostras
  add column if not exists data_fabricacao date,
  add column if not exists data_validade date,
  add column if not exists lote text,
  add column if not exists fornecedor text,
  add column if not exists quantidade text,
  add column if not exists natureza_fisica text;

/* ============================================================
   BANCADA — conferência do mapeamento contra a migração
   Sem um Postgres à mão, um nome de coluna errado só apareceria
   em produção, no meio de uma importação. Este teste lê o SQL da
   migração e cobra duas coisas das linhas declaradas em mapas.ts:
   que toda coluna citada exista, e que nenhuma coluna obrigatória
   das tabelas em que a aplicação insere fique de fora.
   ============================================================ */

import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const aqui = dirname(fileURLToPath(import.meta.url));
const migracoes = [
  '20251008120000_bancada_lims.sql',
  '20251030120000_bancada_cadastros.sql',
  '20251030130000_bancada_importacoes.sql',
  '20251030140000_bancada_criterios.sql',
  '20251030150000_bancada_equipamentos.sql',
  '20251030160000_bancada_formulas.sql',
];
const sql = migracoes
  .map((arquivo) => readFileSync(resolve(aqui, '../../../supabase/migrations', arquivo), 'utf8'))
  .join('\n');
const fonte = readFileSync(resolve(aqui, 'mapas.ts'), 'utf8');

/** Linha → tabela. Explícito de propósito: o teste não deve adivinhar. */
const TABELA: Record<string, string> = {
  LinhaUnidade: 'lab_unidades',
  LinhaPapel: 'lab_papeis',
  LinhaMembro: 'lab_membros',
  LinhaGrupo: 'lab_grupos_analise',
  LinhaParametro: 'lab_parametros',
  LinhaTabelaPreco: 'lab_tabelas_preco',
  LinhaCliente: 'lab_clientes',
  LinhaLote: 'lab_lotes_recepcao',
  LinhaAmostra: 'lab_amostras',
  LinhaEnsaio: 'lab_ensaios',
  LinhaEquipamento: 'lab_equipamentos',
  LinhaTipoEquipamento: 'lab_tipos_equipamento',
  LinhaVerificacao: 'lab_verificacoes_equipamento',
  LinhaModeloImportacao: 'lab_modelos_importacao',
  LinhaFormula: 'lab_formulas',
  LinhaCalibracao: 'lab_calibracoes',
  LinhaLeituraPh: 'lab_leituras_ph',
  LinhaContato: 'lab_contatos',
  LinhaOportunidade: 'lab_oportunidades',
  LinhaInteracao: 'lab_interacoes',
  LinhaAmostraControle: 'lab_amostras_controle',
  LinhaRegistroCQ: 'lab_registros_cq',
  LinhaLaudo: 'lab_laudos',
  LinhaOrcamento: 'lab_orcamentos',
  LinhaNotaFiscal: 'lab_notas_fiscais',
  LinhaTitulo: 'lab_titulos',
  LinhaItemEstoque: 'lab_itens_estoque',
  LinhaLoteReagente: 'lab_lotes_reagente',
  LinhaMovimentoEstoque: 'lab_movimentos_estoque',
  LinhaAuditoria: 'lab_auditoria',
  LinhaTipoAnalise: 'lab_tipos_analise',
  LinhaCurva: 'lab_curvas',
  LinhaLegenda: 'lab_legendas',
  LinhaMetodologia: 'lab_metodologias',
  LinhaBandeja: 'lab_bandejas',
  LinhaItemCadastro: 'lab_itens_cadastro',
  LinhaConvenio: 'lab_convenios',
  LinhaRegraDesconto: 'lab_regras_desconto',
  LinhaImportacao: 'lab_importacoes',
  LinhaImportacaoEnsaio: 'lab_importacoes_ensaios',
  LinhaCriterio: 'lab_criterios',
};

/** Tabelas em que a aplicação insere linha nova. */
const INSERE = new Set([
  'lab_lotes_recepcao', 'lab_amostras', 'lab_ensaios', 'lab_leituras_ph',
  'lab_calibracoes', 'lab_clientes', 'lab_papeis', 'lab_notas_fiscais',
  'lab_titulos', 'lab_movimentos_estoque', 'lab_registros_cq', 'lab_curvas',
  'lab_legendas', 'lab_importacoes', 'lab_importacoes_ensaios',
  'lab_criterios',
]);

interface Coluna { nome: string; obrigatoria: boolean }

function colunasDa(tabela: string): Coluna[] {
  const inicio = sql.indexOf(`create table public.${tabela} (`);
  if (inicio === -1) throw new Error(`tabela ${tabela} não existe na migração`);
  const corpo = sql.slice(inicio + `create table public.${tabela} (`.length);
  const fim = corpo.indexOf('\n);');
  const linhas = corpo.slice(0, fim).split('\n');

  const colunas: Coluna[] = [];
  for (const bruta of linhas) {
    const linha = bruta.trim();
    if (!linha || linha.startsWith('--') || linha.startsWith('constraint')
      || linha.startsWith('unique') || linha.startsWith('primary key')
      || linha.startsWith('check') || linha.startsWith('foreign key')) continue;
    const nome = linha.split(/\s+/)[0]?.replace(/[,(]/g, '');
    if (!nome || !/^[a-z_][a-z0-9_]*$/.test(nome)) continue;
    colunas.push({
      nome,
      obrigatoria: /\bnot null\b/.test(linha) && !/\bdefault\b/.test(linha)
        && !/\bprimary key\b/.test(linha),
    });
  }
  return colunas;
}

function camposDa(linha: string): string[] {
  const inicio = fonte.indexOf(`export interface ${linha} {`);
  if (inicio === -1) throw new Error(`interface ${linha} não existe em mapas.ts`);
  const corpo = fonte.slice(inicio + `export interface ${linha} {`.length);
  const bloco = corpo.slice(0, corpo.indexOf('\n}'));
  return [...bloco.matchAll(/([a-z_][a-z0-9_]*)\s*:/gi)].map((m) => m[1]);
}

let falhas = 0;
const relatar = (ok: boolean, texto: string) => {
  console.log(`${ok ? 'ok  ' : 'FALHA'} ${texto}`);
  if (!ok) falhas += 1;
};

for (const [linha, tabela] of Object.entries(TABELA)) {
  const colunas = colunasDa(tabela);
  const nomes = new Set(colunas.map((c) => c.nome));
  const campos = camposDa(linha);

  const inventados = campos.filter((c) => !nomes.has(c));
  relatar(inventados.length === 0,
    `${linha} → ${tabela}: ${campos.length} colunas${inventados.length ? ` — inexistentes: ${inventados.join(', ')}` : ''}`);

  if (INSERE.has(tabela)) {
    const emFalta = colunas.filter((c) => c.obrigatoria && !campos.includes(c.nome)).map((c) => c.nome);
    relatar(emFalta.length === 0,
      `${tabela}: obrigatórias cobertas${emFalta.length ? ` — faltam: ${emFalta.join(', ')}` : ''}`);
  }
}

// As tabelas que a carga lê precisam existir com o nome exato usado no repositório.
const repositorio = readFileSync(resolve(aqui, 'repositorio.ts'), 'utf8');
const citadas = [...repositorio.matchAll(/'(lab_[a-z_]+)'/g)].map((m) => m[1]);
for (const tabela of [...new Set(citadas)]) {
  relatar(sql.includes(`create table public.${tabela} (`), `repositório cita ${tabela}`);
}

/* As verificações acima correm na carga do módulo e somam em `falhas`.
   Este caso é o que leva o total ao relatório do vitest. */
it('esquema das migrações', () => {
  expect(falhas).toBe(0);
});

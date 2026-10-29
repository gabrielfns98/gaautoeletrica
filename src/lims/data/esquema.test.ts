/* ============================================================
   BANCADA — conferência do mapeamento contra a migração
   Sem um Postgres à mão, um nome de coluna errado só apareceria
   em produção, no meio de uma importação. Este teste lê o SQL da
   migração e cobra duas coisas das linhas declaradas em mapas.ts:
   que toda coluna citada exista, e que nenhuma coluna obrigatória
   das tabelas em que a aplicação insere fique de fora.
   ============================================================ */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const aqui = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(
  resolve(aqui, '../../../supabase/migrations/20251008120000_bancada_lims.sql'), 'utf8',
);
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
  LinhaCalibracao: 'lab_calibracoes',
  LinhaLeituraPh: 'lab_leituras_ph',
};

/** Tabelas em que a aplicação insere linha nova. */
const INSERE = new Set([
  'lab_lotes_recepcao', 'lab_amostras', 'lab_ensaios', 'lab_leituras_ph', 'lab_calibracoes',
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

console.log(falhas === 0
  ? '\nMAPEAMENTO CONFERE COM A MIGRAÇÃO'
  : `\n${falhas} divergência(s) entre o código e a migração`);
process.exit(falhas === 0 ? 0 : 1);

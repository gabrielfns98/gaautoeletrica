/* ============================================================
   BANCADA — papéis e permissões
   Modelo: papel → conjunto de permissões "modulo:acao".
   O mesmo conjunto é espelhado nas policies RLS do Postgres,
   de modo que a UI nunca é a única barreira.
   ============================================================ */

import { ACOES, MODULOS } from '../types';
import type { Acao, Modulo, Papel, Permissao, Usuario } from '../types';

/** Todas as permissões possíveis — usado pelo papel de administrador. */
export const TODAS_PERMISSOES: Permissao[] = MODULOS.flatMap((m) =>
  ACOES.map((a) => `${m}:${a}` as Permissao),
);

/** Açúcar sintático: 'amostras' → ['amostras:ver','amostras:criar',...] */
function todas(modulo: Modulo, ...acoes: Acao[]): Permissao[] {
  const lista = acoes.length ? acoes : [...ACOES];
  return lista.map((a) => `${modulo}:${a}` as Permissao);
}

export const PAPEIS_PADRAO: Papel[] = [
  {
    id: 'papel-admin',
    nome: 'Administrador',
    descricao: 'Acesso irrestrito, incluindo configuração fiscal e gestão de usuários.',
    sistema: true,
    cor: '214 72% 55%',
    permissoes: TODAS_PERMISSOES,
  },
  {
    id: 'papel-rt',
    nome: 'Responsável Técnico',
    descricao: 'Aprova resultados e assina laudos. É quem responde tecnicamente pelo laboratório.',
    sistema: true,
    cor: '172 66% 46%',
    permissoes: [
      ...todas('dashboard', 'ver'),
      ...todas('recepcao', 'ver'),
      ...todas('amostras', 'ver', 'editar', 'exportar'),
      ...todas('ph', 'ver', 'criar', 'editar', 'aprovar', 'exportar'),
      ...todas('analises', 'ver', 'criar', 'editar', 'aprovar', 'exportar'),
      ...todas('laudos', 'ver', 'criar', 'editar', 'aprovar', 'exportar'),
      ...todas('equipamentos', 'ver', 'criar', 'editar', 'aprovar'),
      ...todas('estoque', 'ver'),
      ...todas('auditoria', 'ver', 'exportar'),
      ...todas('configuracoes', 'ver'),
    ],
  },
  {
    id: 'papel-analista',
    nome: 'Analista de bancada',
    descricao: 'Executa ensaios, opera o potenciômetro e registra leituras. Não aprova resultado próprio.',
    sistema: true,
    cor: '186 62% 45%',
    permissoes: [
      ...todas('dashboard', 'ver'),
      ...todas('amostras', 'ver'),
      ...todas('ph', 'ver', 'criar', 'editar'),
      ...todas('analises', 'ver', 'criar', 'editar'),
      ...todas('laudos', 'ver'),
      ...todas('equipamentos', 'ver', 'criar'),
      ...todas('estoque', 'ver', 'criar', 'editar'),
    ],
  },
  {
    id: 'papel-recepcao',
    nome: 'Recepção de amostras',
    descricao: 'Protocola lotes, confere conformidade na entrada e distribui para a bancada.',
    sistema: true,
    cor: '38 92% 55%',
    permissoes: [
      ...todas('dashboard', 'ver'),
      ...todas('recepcao', 'ver', 'criar', 'editar', 'exportar'),
      ...todas('amostras', 'ver', 'criar', 'editar'),
      ...todas('analises', 'ver'),
      ...todas('crm', 'ver'),
      ...todas('laudos', 'ver'),
    ],
  },
  {
    id: 'papel-comercial',
    nome: 'Comercial',
    descricao: 'Cuida da carteira de clientes, do funil e das propostas.',
    sistema: true,
    cor: '280 56% 58%',
    permissoes: [
      ...todas('dashboard', 'ver'),
      ...todas('crm', 'ver', 'criar', 'editar', 'exportar'),
      ...todas('amostras', 'ver'),
      ...todas('laudos', 'ver', 'exportar'),
      ...todas('financeiro', 'ver'),
    ],
  },
  {
    id: 'papel-financeiro',
    nome: 'Financeiro',
    descricao: 'Contas a receber e a pagar, emissão e acompanhamento de notas fiscais.',
    sistema: true,
    cor: '152 58% 44%',
    permissoes: [
      ...todas('dashboard', 'ver'),
      ...todas('financeiro', 'ver', 'criar', 'editar', 'excluir', 'exportar'),
      ...todas('fiscal', 'ver', 'criar', 'editar', 'aprovar', 'exportar'),
      ...todas('crm', 'ver'),
      ...todas('estoque', 'ver'),
    ],
  },
  {
    id: 'papel-cliente',
    nome: 'Portal do cliente',
    descricao: 'Acompanha o andamento das próprias amostras e baixa os laudos liberados.',
    sistema: true,
    cor: '220 12% 55%',
    permissoes: [
      ...todas('dashboard', 'ver'),
      ...todas('amostras', 'ver'),
      ...todas('laudos', 'ver', 'exportar'),
    ],
  },
];

/* ---------------- Verificação ---------------- */

export function papelPorId(papeis: Papel[], id: string): Papel | undefined {
  return papeis.find((p) => p.id === id);
}

export function temPermissao(papel: Papel | undefined, permissao: Permissao): boolean {
  if (!papel) return false;
  return papel.permissoes.includes(permissao);
}

export function podeVer(papel: Papel | undefined, modulo: Modulo): boolean {
  return temPermissao(papel, `${modulo}:ver`);
}

/**
 * Um analista não pode aprovar o próprio resultado — segregação de
 * funções exigida pela ISO/IEC 17025 (item 7.8.1).
 */
export function podeAprovarEnsaio(
  papel: Papel | undefined,
  usuario: Usuario | undefined,
  analistaIdDoEnsaio: string | undefined,
): { permitido: boolean; motivo?: string } {
  if (!temPermissao(papel, 'analises:aprovar')) {
    return { permitido: false, motivo: 'Seu papel não permite aprovar resultados.' };
  }
  if (usuario && analistaIdDoEnsaio && usuario.id === analistaIdDoEnsaio) {
    return {
      permitido: false,
      motivo: 'Segregação de funções: o resultado deve ser aprovado por um segundo responsável.',
    };
  }
  return { permitido: true };
}

/** Rótulos legíveis para a matriz de permissões da tela de usuários. */
export const ROTULO_MODULO: Record<Modulo, string> = {
  dashboard: 'Painel',
  recepcao: 'Recepção',
  amostras: 'Amostras',
  ph: 'Leitura de pH',
  analises: 'Ensaios',
  laudos: 'Laudos',
  crm: 'CRM',
  financeiro: 'Financeiro',
  fiscal: 'Fiscal',
  estoque: 'Estoque',
  equipamentos: 'Equipamentos',
  usuarios: 'Usuários',
  configuracoes: 'Configurações',
  auditoria: 'Auditoria',
};

export const ROTULO_ACAO: Record<Acao, string> = {
  ver: 'Ver',
  criar: 'Criar',
  editar: 'Editar',
  excluir: 'Excluir',
  aprovar: 'Aprovar',
  exportar: 'Exportar',
};

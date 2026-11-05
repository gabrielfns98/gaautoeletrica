/* ============================================================
   BANCADA — o que está fora do escopo agora

   O pedido do laboratório foi claro: "esquece do financeiro, mais
   essa parte do analista mesmo — financeiro fica pra depois".

   "Pra depois" quer dizer que o código continua aqui, testado, e
   volta quando for a vez dele. Mas hoje ele não aparece: nem no
   menu, nem por endereço digitado, nem como indicador no painel.
   Um módulo que está na tela e que ninguém pediu é ruído para quem
   está avaliando o que pediu.

   Voltar com ele é tirar o nome desta lista.
   ============================================================ */

import type { Modulo } from './types';

/** Módulos guardados para depois. */
const ADIADOS: ReadonlySet<Modulo> = new Set<Modulo>(['financeiro', 'fiscal']);

export const adiado = (modulo: Modulo): boolean => ADIADOS.has(modulo);

/**
 * A parte comercial do CRM — funil de oportunidades e propostas —
 * sai junto com o financeiro: é venda, não bancada. O cadastro de
 * clientes fica, porque a recepção protocola o lote para um cliente
 * e sem ele o analista não recebe amostra nenhuma.
 */
export const COMERCIAL_ADIADO = true;

/**
 * O papel Financeiro só dava acesso aos módulos adiados. Oferecê-lo
 * ao cadastrar alguém criaria um usuário que entra e não vê nada.
 */
const PAPEIS_ADIADOS: ReadonlySet<string> = new Set(['papel-financeiro']);

export const papelVisivel = (papelId: string): boolean => !PAPEIS_ADIADOS.has(papelId);

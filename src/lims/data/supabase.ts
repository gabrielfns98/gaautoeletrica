/* ============================================================
   BANCADA — conexão com o banco
   O modo é explícito, nunca adivinhado: sem VITE_BANCADA_BACKEND
   a aplicação roda em demonstração, com massa em memória. Cair
   em demonstração por falha de conexão seria pior que falhar —
   o analista digitaria resultado no vazio sem perceber.
   ============================================================ */

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const chave = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
const pedido = import.meta.env.VITE_BANCADA_BACKEND === 'supabase';

/** Verdadeiro quando a aplicação deve ler e gravar no Supabase. */
export const COM_BANCO = Boolean(pedido && url && chave);

/** Por que o banco não está ligado — aparece na tela de configuração. */
export const MOTIVO_SEM_BANCO = !pedido
  ? 'VITE_BANCADA_BACKEND não está definido como "supabase"'
  : !url
    ? 'VITE_SUPABASE_URL não está definida'
    : !chave
      ? 'VITE_SUPABASE_PUBLISHABLE_KEY não está definida'
      : '';

export const supabase: SupabaseClient | null = COM_BANCO
  ? createClient(url as string, chave as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: 'bancada.auth',
      },
    })
  : null;

/** Uso interno das funções que só rodam no modo banco. */
export function exigirBanco(): SupabaseClient {
  if (!supabase) throw new Error(`Banco não configurado: ${MOTIVO_SEM_BANCO}`);
  return supabase;
}

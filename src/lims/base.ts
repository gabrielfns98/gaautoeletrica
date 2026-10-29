/* ============================================================
   BANCADA — prefixo das rotas
   A Bancada é um produto por si: servida sozinha, mora na raiz do
   domínio; montada dentro de outra aplicação, mora sob /lab. Um
   único lugar decide o prefixo para que rota, link do menu e
   redirecionamento nunca divirjam.
   ============================================================ */

const sozinha = import.meta.env.VITE_BANCADA_SOZINHA === '1';

export const BASE = sozinha ? '' : '/lab';

/** Caminho absoluto de uma página da Bancada: rota('/amostras'). */
export const rota = (sufixo = '') => `${BASE}${sufixo}` || '/';

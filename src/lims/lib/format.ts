/* ============================================================
   BANCADA — formatação pt-BR e validadores fiscais
   ============================================================ */

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const BRL_COMPACTO = new Intl.NumberFormat('pt-BR', {
  style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1,
});

export const moeda = (v: number) => BRL.format(Number.isFinite(v) ? v : 0);

/**
 * Abrevia só a partir de mil. Abaixo disso a notação compacta produz
 * "R$ 838,9", que esconde os centavos e parece valor truncado.
 */
export function moedaCompacta(v: number): string {
  const n = Number.isFinite(v) ? v : 0;
  return Math.abs(n) < 1000 ? BRL.format(n) : BRL_COMPACTO.format(n);
}

export function numero(v: number, casas = 2): string {
  if (!Number.isFinite(v)) return '—';
  return v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

export function percentual(v: number, casas = 1): string {
  if (!Number.isFinite(v)) return '—';
  return `${numero(v, casas)}%`;
}

/* ---------------- Datas ---------------- */

/**
 * Fuso do laboratório. Data de laudo, hora de leitura e prazo não podem
 * mudar conforme o relógio de quem abre a tela: o registro é do ensaio,
 * não do aparelho. Enquanto a Bancada opera no Brasil isto é uma
 * constante; quando houver unidade em outro fuso, vira configuração da
 * unidade e passa por aqui do mesmo jeito.
 */
export const FUSO = 'America/Sao_Paulo';

const asDate = (d: string | Date) => (d instanceof Date ? d : new Date(d));

/** Dia do calendário no fuso do laboratório, como número aaaammdd. */
function diaLocal(d: Date): number {
  const [{ value: dia }, , { value: mes }, , { value: ano }] = new Intl.DateTimeFormat('pt-BR', {
    timeZone: FUSO, day: '2-digit', month: '2-digit', year: 'numeric',
  }).formatToParts(d);
  return Number(`${ano}${mes}${dia}`);
}

/**
 * Dia do calendário no fuso do laboratório, como aaaa-mm-dd — o
 * formato que `<input type="date">` exige. Passar por aqui evita o
 * erro clássico de usar `toISOString().slice(0, 10)`, que devolve o
 * dia em UTC e atrasa a data em um dia durante a tarde no Brasil.
 */
export function dataISOLocal(d: string | Date | undefined): string {
  if (!d) return '';
  const dt = asDate(d);
  if (Number.isNaN(dt.getTime())) return '';
  const n = diaLocal(dt);
  return `${Math.floor(n / 10000)}-${String(Math.floor(n / 100) % 100).padStart(2, '0')}-${String(n % 100).padStart(2, '0')}`;
}

export function data(d: string | Date | undefined): string {
  if (!d) return '—';
  const dt = asDate(d);
  return Number.isNaN(dt.getTime()) ? '—'
    : dt.toLocaleDateString('pt-BR', { timeZone: FUSO, day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function dataHora(d: string | Date | undefined): string {
  if (!d) return '—';
  const dt = asDate(d);
  return Number.isNaN(dt.getTime()) ? '—'
    : dt.toLocaleString('pt-BR', {
        timeZone: FUSO,
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
}

export function hora(d: string | Date | undefined): string {
  if (!d) return '—';
  const dt = asDate(d);
  return Number.isNaN(dt.getTime()) ? '—'
    : dt.toLocaleTimeString('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function dataExtenso(d: string | Date): string {
  return asDate(d).toLocaleDateString('pt-BR', { timeZone: FUSO, day: '2-digit', month: 'long', year: 'numeric' });
}

/** Diferença em dias entre duas datas (b − a), arredondada para baixo. */
/**
 * Diferença em dias de calendário no fuso do laboratório — não em blocos
 * de 24 h. "Ontem às 23h" é um dia atrás mesmo quando faltam duas horas
 * para completar 24.
 */
export function diasEntre(a: string | Date, b: string | Date = new Date()): number {
  const inicio = Date.UTC(
    Math.floor(diaLocal(asDate(a)) / 10000),
    Math.floor(diaLocal(asDate(a)) / 100) % 100 - 1,
    diaLocal(asDate(a)) % 100,
  );
  const fim = Date.UTC(
    Math.floor(diaLocal(asDate(b)) / 10000),
    Math.floor(diaLocal(asDate(b)) / 100) % 100 - 1,
    diaLocal(asDate(b)) % 100,
  );
  return Math.round((fim - inicio) / 86_400_000);
}

export function diasAte(d: string | Date): number {
  return -diasEntre(d);
}

export function tempoRelativo(d: string | Date): string {
  const dias = diasEntre(d);
  if (dias === 0) {
    const horas = Math.floor((Date.now() - asDate(d).getTime()) / 3_600_000);
    if (horas < 1) {
      const min = Math.max(1, Math.floor((Date.now() - asDate(d).getTime()) / 60_000));
      return `há ${min} min`;
    }
    return `há ${horas} h`;
  }
  if (dias === 1) return 'ontem';
  if (dias < 0) return `em ${-dias} dia${dias === -1 ? '' : 's'}`;
  if (dias < 30) return `há ${dias} dias`;
  if (dias < 365) return `há ${Math.floor(dias / 30)} meses`;
  return `há ${Math.floor(dias / 365)} ano(s)`;
}

/** Duração em segundos → "1 m 24 s" */
export function duracao(segundos: number): string {
  if (!Number.isFinite(segundos) || segundos < 0) return '—';
  const s = Math.round(segundos);
  if (s < 60) return `${s} s`;
  return `${Math.floor(s / 60)} m ${String(s % 60).padStart(2, '0')} s`;
}

/* ---------------- Documentos ---------------- */

const digitos = (v: string) => v.replace(/\D/g, '');

export function mascaraCnpj(v: string): string {
  const d = digitos(v).slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

export function mascaraCpf(v: string): string {
  const d = digitos(v).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
}

export function mascaraDocumento(v: string): string {
  return digitos(v).length > 11 ? mascaraCnpj(v) : mascaraCpf(v);
}

export function validarCpf(v: string): boolean {
  const d = digitos(v);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const dv = (fatiaAte: number) => {
    let soma = 0;
    for (let i = 0; i < fatiaAte; i++) soma += Number(d[i]) * (fatiaAte + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === Number(d[9]) && dv(10) === Number(d[10]);
}

export function validarCnpj(v: string): boolean {
  const d = digitos(v);
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const dv = (fatiaAte: number) => {
    const pesos = fatiaAte === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let soma = 0;
    for (let i = 0; i < fatiaAte; i++) soma += Number(d[i]) * pesos[i];
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return dv(12) === Number(d[12]) && dv(13) === Number(d[13]);
}

export function validarDocumento(v: string): boolean {
  return digitos(v).length > 11 ? validarCnpj(v) : validarCpf(v);
}

export function mascaraTelefone(v: string): string {
  const d = digitos(v).slice(0, 11);
  if (d.length <= 10) return d.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
  return d.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
}

export function mascaraCep(v: string): string {
  return digitos(v).slice(0, 8).replace(/^(\d{5})(\d)/, '$1-$2');
}

/* ---------------- Texto ---------------- */

export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter((p) => p.length > 2);
  if (partes.length === 0) return nome.slice(0, 2).toUpperCase();
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export function truncar(texto: string, max: number): string {
  return texto.length <= max ? texto : `${texto.slice(0, max - 1)}…`;
}

/** Normaliza para busca: sem acento, minúsculo. */
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export function contem(alvo: string, termo: string): boolean {
  return normalizar(alvo).includes(normalizar(termo));
}

export function plural(n: number, singular: string, pluralForma?: string): string {
  return n === 1 ? singular : (pluralForma ?? `${singular}s`);
}

/** Normaliza: maiúscula, sem hífen/espaço. */
export function normalizarPlaca(placa: string): string {
  return placa.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

const ANTIGA = /^[A-Z]{3}\d{4}$/;
const MERCOSUL = /^[A-Z]{3}\d[A-Z]\d{2}$/;

export function placaValida(placa: string): boolean {
  const p = normalizarPlaca(placa);
  return ANTIGA.test(p) || MERCOSUL.test(p);
}

/** Exibição: ABC1234 -> ABC-1234; Mercosul fica como está. */
export function formatarPlaca(placa: string): string {
  const p = normalizarPlaca(placa);
  return ANTIGA.test(p) ? `${p.slice(0, 3)}-${p.slice(3)}` : p;
}

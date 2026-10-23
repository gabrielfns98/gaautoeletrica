/** Todo cliente da oficina é do Brasil. */
const DDI_BRASIL = "55";

/**
 * Monta o número no formato que o wa.me exige: código do país + DDD + número,
 * só dígitos. Os telefones são cadastrados sem o país (ex.: 34996995786) e,
 * sem o 55 na frente, o WhatsApp lê o 34 como código da Espanha e recusa.
 */
export function paraWhatsApp(telefone: string): string {
  const digitos = telefone.replace(/\D/g, "");

  // 10 dígitos (fixo) ou 11 (celular) é DDD + número, sem o código do país
  if (digitos.length === 10 || digitos.length === 11) {
    return DDI_BRASIL + digitos;
  }
  return digitos;
}

/** Deixa o telefone legível na tela: (34) 99699-5786. */
export function formatarTelefone(telefone: string): string {
  const d = telefone.replace(/\D/g, "");
  const semPais = d.startsWith(DDI_BRASIL) && d.length >= 12 ? d.slice(2) : d;

  if (semPais.length === 11) {
    return `(${semPais.slice(0, 2)}) ${semPais.slice(2, 7)}-${semPais.slice(7)}`;
  }
  if (semPais.length === 10) {
    return `(${semPais.slice(0, 2)}) ${semPais.slice(2, 6)}-${semPais.slice(6)}`;
  }
  return telefone;
}

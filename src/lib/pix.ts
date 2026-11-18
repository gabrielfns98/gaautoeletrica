/**
 * Gera o "Pix Copia e Cola" (BR Code estático, padrão EMV do Banco Central).
 * O mesmo texto é usado para desenhar o QR Code.
 */

const field = (id: string, value: string) => `${id}${value.length.toString().padStart(2, "0")}${value}`;

/** Remove acentos/caracteres especiais (alguns bancos rejeitam). */
const sanitize = (text: string, max: number) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .trim()
    .toUpperCase()
    .slice(0, max);

/** CRC16-CCITT (polinômio 0x1021, valor inicial 0xFFFF). */
const crc16 = (payload: string) => {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
};

export interface PixOptions {
  chave: string;
  nome: string;
  cidade: string;
  /** Valor em reais. Omitir para o pagador digitar o valor. */
  valor?: number | null;
  /** Identificador da cobrança (até 25 letras/números). */
  txid?: string;
  descricao?: string;
}

export const gerarPixCopiaECola = ({ chave, nome, cidade, valor, txid, descricao }: PixOptions) => {
  const conta =
    field("00", "br.gov.bcb.pix") +
    field("01", chave.trim()) +
    (descricao ? field("02", sanitize(descricao, 40)) : "");

  const id = (txid ?? "").replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "***";

  const payload =
    field("00", "01") +
    field("26", conta) +
    field("52", "0000") +
    field("53", "986") +
    (valor && valor > 0 ? field("54", valor.toFixed(2)) : "") +
    field("58", "BR") +
    field("59", sanitize(nome, 25)) +
    field("60", sanitize(cidade, 15)) +
    field("62", field("05", id)) +
    "6304";

  return payload + crc16(payload);
};

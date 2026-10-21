import fs from "node:fs";
import path from "node:path";
import { Font } from "@react-pdf/renderer";

let familia: string | null = null;

/**
 * Usa a Roboto embutida quando os arquivos estão em public/fonts (acentos e "R$"
 * saem iguais aos do desenho original). Se não estiverem, cai para a Helvetica
 * interna do PDF, que também cobre os acentos do português.
 */
export function registrarFontes(): string {
  if (familia) return familia;

  const dir = path.join(process.cwd(), "public", "fonts");
  const regular = path.join(dir, "Roboto-Regular.ttf");
  const bold = path.join(dir, "Roboto-Bold.ttf");

  if (fs.existsSync(regular) && fs.existsSync(bold)) {
    Font.register({
      family: "Roboto",
      fonts: [
        { src: regular, fontWeight: 400 },
        { src: bold, fontWeight: 700 },
      ],
    });
    familia = "Roboto";
  } else {
    familia = "Helvetica";
  }

  Font.registerHyphenationCallback((palavra) => [palavra]);
  return familia;
}

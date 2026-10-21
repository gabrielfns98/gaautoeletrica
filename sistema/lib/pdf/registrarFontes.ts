import path from "node:path";
import { Font } from "@react-pdf/renderer";

let registrado = false;

/** Roboto embutida: garante acentos e "R$" corretos no PDF. */
export function registrarFontes() {
  if (registrado) return;
  const dir = path.join(process.cwd(), "public", "fonts");
  Font.register({
    family: "Roboto",
    fonts: [
      { src: path.join(dir, "Roboto-Regular.ttf"), fontWeight: 400 },
      { src: path.join(dir, "Roboto-Bold.ttf"), fontWeight: 700 },
    ],
  });
  Font.registerHyphenationCallback((palavra) => [palavra]);
  registrado = true;
}

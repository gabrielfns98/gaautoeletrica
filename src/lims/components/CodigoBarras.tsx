/* ============================================================
   BANCADA — código de barras
   Code128 pela JsBarcode, não por tabela escrita à mão: etiqueta
   que não lê no leitor da recepção é pior que etiqueta nenhuma.
   ============================================================ */

import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

export function CodigoBarras({
  valor, altura = 36, largura = 1.5, mostrarTexto = false,
}: {
  valor: string;
  /** altura das barras em px */
  altura?: number;
  /** largura do módulo estreito em px */
  largura?: number;
  mostrarTexto?: boolean;
}) {
  const alvo = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!alvo.current) return;
    try {
      JsBarcode(alvo.current, valor, {
        format: 'CODE128',
        width: largura,
        height: altura,
        displayValue: mostrarTexto,
        margin: 0,
        background: 'transparent',
        lineColor: '#000000',
      });
    } catch {
      // Valor que o Code128 não codifica: a etiqueta sai só com o texto.
      alvo.current.replaceChildren();
    }
  }, [valor, altura, largura, mostrarTexto]);

  return <svg ref={alvo} role="img" aria-label={`Código de barras ${valor}`} />;
}

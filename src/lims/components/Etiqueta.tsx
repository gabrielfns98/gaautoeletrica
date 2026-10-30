/* ============================================================
   BANCADA — a etiqueta da amostra

   Mora fora da página de etiquetas porque a bancada reimprime uma
   avulsa a partir do detalhe da amostra, e a etiqueta reimpressa
   tem de sair idêntica à da folha: é o mesmo código de barras que o
   leitor vai ler na importação.
   ============================================================ */

import { CodigoBarras } from './CodigoBarras';
import { data as formatarData } from '../lib/format';
import type { Amostra } from '../types';

export type FormatoEtiqueta = 'a4-3x8' | 'a4-2x7' | 'termica';

/** Medidas reais das folhas de etiqueta mais comuns no mercado. */
export const FORMATOS_ETIQUETA: Record<FormatoEtiqueta, {
  rotulo: string; colunas: number; largura: string; altura: string; barras: number;
}> = {
  'a4-3x8': { rotulo: 'A4 · 3 × 8', colunas: 3, largura: '63.5mm', altura: '33.9mm', barras: 26 },
  'a4-2x7': { rotulo: 'A4 · 2 × 7', colunas: 2, largura: '99.1mm', altura: '38.1mm', barras: 30 },
  termica: { rotulo: 'Térmica 50 × 25', colunas: 1, largura: '50mm', altura: '25mm', barras: 20 },
};

export function Etiqueta({ amostra, cliente, grupo, altura, barras }: {
  amostra: Amostra; cliente: string; grupo: string; altura: string; barras: number;
}) {
  return (
    <div
      className="etiqueta flex flex-col justify-between overflow-hidden border border-dashed border-neutral-300 px-2 py-1.5 text-black"
      style={{ height: altura }}
    >
      <div className="flex items-baseline justify-between gap-2 text-[0.6rem] leading-none">
        <span className="truncate font-semibold uppercase tracking-wide">{cliente}</span>
        <span className="shrink-0 font-mono">{grupo}</span>
      </div>

      <div className="flex justify-center">
        <CodigoBarras valor={amostra.protocolo} altura={barras} largura={1.3} />
      </div>

      <div className="flex items-baseline justify-between gap-2 leading-none">
        <span className="font-mono text-[0.72rem] font-semibold tracking-tight">{amostra.protocolo}</span>
        <span className="truncate text-[0.58rem]">{formatarData(amostra.dataRecepcao)}</span>
      </div>

      <p className="truncate text-[0.6rem] leading-tight">
        {amostra.identificacaoCampo}
        {amostra.profundidade ? ` · ${amostra.profundidade}` : ''}
      </p>
    </div>
  );
}

/**
 * Uma etiqueta sozinha, pronta para o `window.print()` — a reimpressão
 * que a recepção faz quando a etiqueta original rasgou ou borrou.
 */
export function FolhaEtiquetaAvulsa({
  amostra, cliente, grupo, formato = 'termica',
}: {
  amostra: Amostra; cliente: string; grupo: string; formato?: FormatoEtiqueta;
}) {
  const medidas = FORMATOS_ETIQUETA[formato];
  return (
    <div
      className="folha-etiquetas grid w-max justify-start gap-2 bg-white p-3"
      style={{ gridTemplateColumns: medidas.largura }}
    >
      <Etiqueta
        amostra={amostra}
        cliente={cliente}
        grupo={grupo}
        altura={medidas.altura}
        barras={medidas.barras}
      />
    </div>
  );
}

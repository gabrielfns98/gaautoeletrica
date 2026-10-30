/* ============================================================
   BANCADA — etiquetas de amostra
   O protocolo impresso em código de barras é o que faz a planilha
   do instrumento casar sozinha com a amostra na importação. Sem
   ele, alguém confere número a número.
   ============================================================ */

import { useMemo, useState } from 'react';
import { Barcode, Printer } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

import { useBancada } from '../data/store';
import { CodigoBarras } from '../components/CodigoBarras';
import { CabecalhoPagina, BarraFiltros, Secao, Segmentos, Vazio, filtrar } from '../components/primitivos';
import { data as formatarData } from '../lib/format';
import type { Amostra } from '../types';

type Formato = 'a4-3x8' | 'a4-2x7' | 'termica';

/** Medidas reais das folhas de etiqueta mais comuns no mercado. */
const FORMATOS: Record<Formato, {
  rotulo: string; colunas: number; largura: string; altura: string; barras: number;
}> = {
  'a4-3x8': { rotulo: 'A4 · 3 × 8', colunas: 3, largura: '63.5mm', altura: '33.9mm', barras: 26 },
  'a4-2x7': { rotulo: 'A4 · 2 × 7', colunas: 2, largura: '99.1mm', altura: '38.1mm', barras: 30 },
  termica: { rotulo: 'Térmica 50 × 25', colunas: 1, largura: '50mm', altura: '25mm', barras: 20 },
};

export default function Etiquetas() {
  const { estado, pode } = useBancada();
  const [formato, setFormato] = useState<Formato>('a4-3x8');
  const [loteId, setLoteId] = useState<string>('todos');
  const [busca, setBusca] = useState('');

  const clientePorId = useMemo(
    () => new Map(estado.clientes.map((c) => [c.id, c])),
    [estado.clientes],
  );
  const grupoPorId = useMemo(
    () => new Map(estado.grupos.map((g) => [g.id, g])),
    [estado.grupos],
  );

  /* Lotes recentes primeiro: etiqueta se imprime logo depois de protocolar. */
  const lotes = useMemo(
    () => [...estado.lotesRecepcao]
      .sort((a, b) => b.dataRecepcao.localeCompare(a.dataRecepcao))
      .slice(0, 40),
    [estado.lotesRecepcao],
  );

  const amostras = useMemo(() => {
    const doLote = loteId === 'todos'
      ? estado.amostras
      : estado.amostras.filter((a) => a.loteRecepcaoId === loteId);
    const filtradas = filtrar(doLote, busca, (a) => [
      a.protocolo, a.identificacaoCampo, a.fazenda, a.talhao,
      clientePorId.get(a.clienteId)?.nome,
    ]);
    return filtradas.slice(0, 240);
  }, [estado.amostras, loteId, busca, clientePorId]);

  if (!pode('amostras:ver')) {
    return (
      <>
        <CabecalhoPagina eyebrow="Recepção" titulo="Etiquetas" />
        <Secao><Vazio icone={Barcode} titulo="Sem permissão para ver amostras" /></Secao>
      </>
    );
  }

  const medidas = FORMATOS[formato];

  return (
    <>
      <CabecalhoPagina
        eyebrow="Recepção"
        titulo="Etiquetas"
        descricao="Protocolo em Code128 para o leitor da bancada casar a amostra sozinho."
        acoes={
          <Button onClick={() => window.print()} disabled={amostras.length === 0}>
            <Printer className="h-4 w-4" />
            Imprimir {amostras.length > 0 ? `(${amostras.length})` : ''}
          </Button>
        }
      />

      <Secao className="nao-imprime">
        <BarraFiltros busca={busca} aoBuscar={setBusca} placeholder="Protocolo, identificação, propriedade…">
          <div className="flex items-center gap-2">
            <Label htmlFor="etiqueta-lote" className="text-xs text-muted-foreground">Lote</Label>
            <Select value={loteId} onValueChange={setLoteId}>
              <SelectTrigger id="etiqueta-lote" className="h-9 w-[15rem] text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os lotes</SelectItem>
                {lotes.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.numero} · {clientePorId.get(l.clienteId)?.nome ?? '—'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </BarraFiltros>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Segmentos
            valor={formato}
            aoMudar={setFormato}
            opcoes={(Object.keys(FORMATOS) as Formato[]).map((f) => ({
              valor: f, rotulo: FORMATOS[f].rotulo,
            }))}
          />
          <p className="text-xs text-muted-foreground">
            {amostras.length === 240
              ? 'Mostrando as 240 primeiras — refine o filtro para imprimir o resto.'
              : `${amostras.length} ${amostras.length === 1 ? 'etiqueta' : 'etiquetas'}`}
          </p>
        </div>
      </Secao>

      {amostras.length === 0 ? (
        <Secao className="mt-5 nao-imprime">
          <Vazio
            icone={Barcode}
            titulo="Nenhuma amostra no filtro"
            descricao="Escolha um lote de recepção ou busque pelo protocolo."
          />
        </Secao>
      ) : (
        <div
          className="folha-etiquetas mt-5 grid justify-start gap-2 rounded-[var(--radius-lg)] bg-white p-3"
          style={{ gridTemplateColumns: `repeat(${medidas.colunas}, ${medidas.largura})` }}
        >
          {amostras.map((a) => (
            <Etiqueta
              key={a.id}
              amostra={a}
              cliente={clientePorId.get(a.clienteId)?.nome ?? ''}
              grupo={grupoPorId.get(a.grupoId)?.abreviacao ?? ''}
              altura={medidas.altura}
              barras={medidas.barras}
            />
          ))}
        </div>
      )}
    </>
  );
}

function Etiqueta({ amostra, cliente, grupo, altura, barras }: {
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

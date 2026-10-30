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
import { Etiqueta, FORMATOS_ETIQUETA } from '../components/Etiqueta';
import type { FormatoEtiqueta } from '../components/Etiqueta';
import { CabecalhoPagina, BarraFiltros, Secao, Segmentos, Vazio, filtrar } from '../components/primitivos';
import type { Amostra } from '../types';

export default function Etiquetas() {
  const { estado, pode } = useBancada();
  const [formato, setFormato] = useState<FormatoEtiqueta>('a4-3x8');
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

  const medidas = FORMATOS_ETIQUETA[formato];

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
            opcoes={(Object.keys(FORMATOS_ETIQUETA) as FormatoEtiqueta[]).map((f) => ({
              valor: f, rotulo: FORMATOS_ETIQUETA[f].rotulo,
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
        /* A folha tem medida de papel, não de tela: no celular ela rola
           dentro da caixa em vez de empurrar a página. Na impressão o
           contêiner some junto com o resto da casca. */
        <div className="mt-5 overflow-x-auto rounded-[var(--radius-lg)]">
        <div
          className="folha-etiquetas grid w-max justify-start gap-2 bg-white p-3"
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
        </div>
      )}
    </>
  );
}

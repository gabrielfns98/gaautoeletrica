/* ============================================================
   BANCADA — emissão de laudos
   ============================================================ */

import { useMemo, useState } from 'react';
import { FileCheck2, Mail, PenLine, Printer, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';

import { useAcoes, useBancada, useIndices } from '../data/store';
import { montarLaudo } from './laudo/montar';
import { FolhaLaudo } from './laudo/Folha';
import type { Disposicao } from './laudo/Folha';
import { data as fData, tempoRelativo } from '../lib/format';
import {
  BarraFiltros, CabecalhoPagina, Indicador, Pilula, Secao, Segmentos, Tabela, Vazio, filtrar,
} from '../components/primitivos';
import type { TomStatus } from '../components/primitivos';
import type { Laudo, StatusLaudo } from '../types';

const TOM: Record<StatusLaudo, TomStatus> = {
  rascunho: 'neutro',
  'aguardando-assinatura': 'alerta',
  emitido: 'sucesso',
  cancelado: 'erro',
};

const ROTULO: Record<StatusLaudo, string> = {
  rascunho: 'Rascunho',
  'aguardando-assinatura': 'Aguardando assinatura',
  emitido: 'Emitido',
  cancelado: 'Cancelado',
};

type Filtro = 'todos' | StatusLaudo;

export default function Laudos() {
  const { estado, pode } = useBancada();
  const { clientePorId, grupoPorId, usuarioPorId } = useIndices();

  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [busca, setBusca] = useState('');
  const [aberto, setAberto] = useState<Laudo | null>(null);

  const contagens = useMemo(() => {
    const c: Record<string, number> = { todos: estado.laudos.length };
    for (const l of estado.laudos) c[l.status] = (c[l.status] ?? 0) + 1;
    return c;
  }, [estado.laudos]);

  const listados = useMemo(() => {
    const base = filtro === 'todos' ? estado.laudos : estado.laudos.filter((l) => l.status === filtro);
    return filtrar(base, busca, (l) => [l.numero, clientePorId.get(l.clienteId)?.nome]);
  }, [estado.laudos, filtro, busca, clientePorId]);

  return (
    <>
      <CabecalhoPagina
        eyebrow="Entrega"
        titulo="Laudos"
        descricao="Compilação dos resultados aprovados, assinatura do responsável técnico e envio ao cliente com código de verificação."
      >
        <div className="mt-6">
          <Segmentos
            valor={filtro}
            aoMudar={setFiltro}
            opcoes={[
              { valor: 'todos', rotulo: 'Todos', contagem: contagens.todos },
              { valor: 'rascunho', rotulo: 'Rascunhos', contagem: contagens.rascunho ?? 0 },
              { valor: 'aguardando-assinatura', rotulo: 'Para assinar', contagem: contagens['aguardando-assinatura'] ?? 0 },
              { valor: 'emitido', rotulo: 'Emitidos', contagem: contagens.emitido ?? 0 },
            ]}
          />
        </div>
      </CabecalhoPagina>

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador rotulo="Emitidos" valor={contagens.emitido ?? 0} detalhe="com assinatura do RT" />
        <Indicador rotulo="Aguardando assinatura" valor={contagens['aguardando-assinatura'] ?? 0} destaque={(contagens['aguardando-assinatura'] ?? 0) > 0} />
        <Indicador rotulo="Enviados por e-mail" valor={estado.laudos.filter((l) => l.enviadoEmail).length} />
        <Indicador rotulo="Reemissões" valor={estado.laudos.filter((l) => l.versao > 1).length} detalhe="laudos em versão 2 ou superior" />
      </div>

      <Secao semPadding>
        <div className="px-5 pt-5">
          <BarraFiltros busca={busca} aoBuscar={setBusca} placeholder="Buscar por número ou cliente…" />
        </div>
        <Tabela
          colunas={[
            { chave: 'numero', titulo: 'Laudo', valor: (l) => l.numero, render: (l) => <span className="num text-xs font-medium">{l.numero}</span> },
            { chave: 'cliente', titulo: 'Cliente', valor: (l) => clientePorId.get(l.clienteId)?.nome ?? '', render: (l) => <span className="truncate text-xs">{clientePorId.get(l.clienteId)?.nome}</span> },
            { chave: 'grupo', titulo: 'Grupo', secundaria: true, render: (l) => <span className="text-xs text-muted-foreground">{grupoPorId.get(l.grupoId)?.nome}</span> },
            { chave: 'qtd', titulo: 'Amostras', alinhamento: 'direita', valor: (l) => l.amostraIds.length, render: (l) => <span className="num text-xs">{l.amostraIds.length}</span> },
            { chave: 'versao', titulo: 'Versão', alinhamento: 'centro', secundaria: true, render: (l) => <span className="num text-xs text-muted-foreground">v{l.versao}</span> },
            {
              chave: 'assinante', titulo: 'Assinado por', secundaria: true,
              render: (l) => <span className="text-xs text-muted-foreground">{l.assinadoPorId ? usuarioPorId.get(l.assinadoPorId)?.nome : '—'}</span>,
            },
            {
              chave: 'status', titulo: 'Status', valor: (l) => l.status,
              render: (l) => (
                <span className="flex items-center gap-1.5">
                  <Pilula tom={TOM[l.status]} className="px-1.5 py-0 text-[0.62rem]">{ROTULO[l.status]}</Pilula>
                  {l.enviadoEmail && <Mail className="h-3 w-3 text-muted-foreground" />}
                </span>
              ),
            },
            {
              chave: 'emissao', titulo: 'Emissão', alinhamento: 'direita', valor: (l) => l.emitidoEm ?? '',
              render: (l) => <span className="num text-xs text-muted-foreground">{l.emitidoEm ? fData(l.emitidoEm) : '—'}</span>,
            },
          ]}
          dados={listados.slice(0, 80)}
          chaveDe={(l) => l.id}
          aoClicar={setAberto}
          ordenacaoInicial={{ chave: 'emissao', direcao: 'desc' }}
          vazio={<Vazio icone={FileCheck2} titulo="Nenhum laudo encontrado" />}
        />
      </Secao>

      <PreVisualizacao laudo={aberto} aoFechar={() => setAberto(null)} podeEmitir={pode('laudos:aprovar')} />
    </>
  );
}

/* ---------------- Pré-visualização ---------------- */

function PreVisualizacao({
  laudo, aoFechar, podeEmitir,
}: { laudo: Laudo | null; aoFechar: () => void; podeEmitir: boolean }) {
  const { estado, unidade } = useBancada();
  const { emitirLaudo } = useAcoes();
  const { clientePorId, grupoPorId, usuarioPorId } = useIndices();

  const [disposicao, setDisposicao] = useState<Disposicao>('amostra');

  const montado = useMemo(() => {
    if (!laudo) return undefined;
    return montarLaudo({
      laudo,
      amostras: estado.amostras,
      ensaios: estado.ensaios,
      parametros: estado.parametros,
      legendas: estado.legendas,
      // A legenda por cultura vale quando o laboratório cadastrou uma:
      // fósforo "baixo" para pastagem pode ser "médio" para soja.
      culturaDe: (a) => a.cultura,
    });
  }, [laudo, estado.amostras, estado.ensaios, estado.parametros, estado.legendas]);

  const observacoes = useMemo(
    () => estado.observacoesFixas.filter((o) => o.ativo).slice(0, 3),
    [estado.observacoesFixas],
  );

  if (!laudo || !montado) return null;

  const cliente = clientePorId.get(laudo.clienteId);
  const grupo = grupoPorId.get(laudo.grupoId);
  const assinante = laudo.assinadoPorId ? usuarioPorId.get(laudo.assinadoPorId) : undefined;

  return (
    <Sheet open onOpenChange={(a) => { if (!a) aoFechar(); }}>
      <SheetContent className="bancada w-full overflow-hidden border-l border-[hsl(var(--line-soft))] bg-background p-0 sm:max-w-4xl">
        <ScrollArea className="h-full">
          <div className="p-6">
            <SheetHeader className="space-y-2 text-left">
              <Pilula tom={TOM[laudo.status]} pontinho>{ROTULO[laudo.status]}</Pilula>
              <SheetTitle className="font-display text-3xl tracking-tight">
                <span className="num">{laudo.numero}</span>
              </SheetTitle>
              <SheetDescription className="text-sm">
                {cliente?.nome} · {grupo?.nome} · {montado.amostras.length} amostras ·{' '}
                <span className="num">{montado.totalResultados}</span> determinações
              </SheetDescription>
            </SheetHeader>

            {montado.totalResultados > 0 && (
              <div className="mt-5 sem-impressao">
                <Segmentos
                  valor={disposicao}
                  aoMudar={setDisposicao}
                  opcoes={[
                    { valor: 'amostra', rotulo: 'Por amostra' },
                    { valor: 'matriz', rotulo: 'Matriz do lote' },
                  ]}
                />
              </div>
            )}

            <div className="mt-6">
              <FolhaLaudo
                laudo={laudo}
                montado={montado}
                cliente={cliente}
                grupo={grupo}
                unidade={unidade}
                assinante={assinante}
                observacoes={observacoes}
                disposicao={disposicao}
              />
            </div>

            {/* --- Ações --- */}
            <div className="mt-6 flex flex-wrap gap-2 sem-impressao">
              {podeEmitir && laudo.status !== 'emitido' && (
                <Button
                  onClick={() => {
                    if (montado.totalResultados === 0) {
                      toast.error('Laudo sem resultado aprovado', {
                        description: 'Aprove os ensaios na tela de Revisão antes de assinar.',
                      });
                      return;
                    }
                    emitirLaudo(laudo.id);
                    toast.success(`${laudo.numero} assinado e emitido.`);
                  }}
                  className="gap-2"
                >
                  <PenLine className="h-4 w-4" /> Assinar e emitir
                </Button>
              )}
              <Button variant="outline" onClick={() => window.print()} className="gap-2">
                <Printer className="h-4 w-4" /> Imprimir
              </Button>
              {laudo.status === 'emitido' && (
                <Button
                  variant="outline"
                  onClick={() => toast.success('Laudo enviado', { description: `Encaminhado para ${cliente?.email}.` })}
                  className="gap-2"
                >
                  <Mail className="h-4 w-4" /> Enviar ao cliente
                </Button>
              )}
            </div>

            {laudo.hashDocumento && (
              <p className="mt-4 flex items-center gap-2 text-[0.68rem] text-muted-foreground sem-impressao">
                <ShieldCheck className="h-3.5 w-3.5" />
                Verificação pública pelo código <span className="num text-foreground">{laudo.hashDocumento}</span>
                {laudo.emitidoEm && ` · emitido ${tempoRelativo(laudo.emitidoEm)}`}
              </p>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

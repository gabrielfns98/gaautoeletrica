/* ============================================================
   BANCADA — acervo de amostras
   ============================================================ */

import { useMemo, useState } from 'react';
import { CheckCheck, ExternalLink, RotateCcw, TestTubes, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { useAcoes, useBancada, useIndices } from '../data/store';
import { podeAprovarEnsaio } from '../lib/rbac';
import { classificarPh, hMaisAlPorSmp } from '../lib/ph';
import { data as fData, dataHora, duracao, numero, tempoRelativo } from '../lib/format';
import {
  BarraFiltros, CabecalhoPagina, Campos, Pilula, Secao, Segmentos, Tabela, Vazio, filtrar,
} from '../components/primitivos';
import { ChipPh, GraficoTrace, ReguaPh } from '../components/ph-visual';
import { AcoesAmostra } from './amostra/Acoes';
import type { TomStatus } from '../components/primitivos';
import type { Amostra, Ensaio, StatusAmostra } from '../types';

const ROTULO: Record<StatusAmostra, string> = {
  recebida: 'Recebida',
  preparo: 'Preparo',
  'em-analise': 'Em análise',
  'aguardando-revisao': 'Aguardando revisão',
  liberada: 'Liberada',
  cancelada: 'Cancelada',
};

const TOM: Record<StatusAmostra, TomStatus> = {
  recebida: 'info',
  preparo: 'info',
  'em-analise': 'primario',
  'aguardando-revisao': 'alerta',
  liberada: 'sucesso',
  cancelada: 'neutro',
};

type Filtro = 'todas' | StatusAmostra | 'atrasadas';

export default function Amostras() {
  const { estado, pode } = useBancada();
  const { clientePorId, grupoPorId } = useIndices();

  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [grupoFiltro, setGrupoFiltro] = useState<string>('todos');
  const [selecionadaId, setSelecionadaId] = useState<string | null>(null);

  const contagens = useMemo(() => {
    const c: Record<string, number> = { todas: estado.amostras.length, atrasadas: 0 };
    for (const a of estado.amostras) {
      c[a.status] = (c[a.status] ?? 0) + 1;
      if (!['liberada', 'cancelada'].includes(a.status) && new Date(a.prazoEntrega) < new Date()) c.atrasadas++;
    }
    return c;
  }, [estado.amostras]);

  const listadas = useMemo(() => {
    let base = estado.amostras;
    if (filtro === 'atrasadas') {
      base = base.filter((a) => !['liberada', 'cancelada'].includes(a.status) && new Date(a.prazoEntrega) < new Date());
    } else if (filtro !== 'todas') {
      base = base.filter((a) => a.status === filtro);
    }
    if (grupoFiltro !== 'todos') base = base.filter((a) => a.grupoId === grupoFiltro);
    return filtrar(base, busca, (a) => [
      a.protocolo, a.identificacaoCampo, a.fazenda, a.talhao, a.cultura,
      clientePorId.get(a.clienteId)?.nome,
    ]);
  }, [estado.amostras, filtro, grupoFiltro, busca, clientePorId]);

  return (
    <>
      <CabecalhoPagina
        eyebrow="Acervo"
        titulo="Amostras"
        descricao="Rastreabilidade completa do protocolo à liberação do laudo, com o histórico de cada determinação."
        acoes={
          <Select value={grupoFiltro} onValueChange={setGrupoFiltro}>
            <SelectTrigger className="h-9 w-52 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-80">
              <SelectItem value="todos">Todos os grupos</SelectItem>
              {estado.grupos.map((g) => <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        }
      >
        <div className="mt-6">
          <Segmentos
            valor={filtro}
            aoMudar={setFiltro}
            opcoes={[
              { valor: 'todas', rotulo: 'Todas', contagem: contagens.todas },
              { valor: 'recebida', rotulo: 'Recebidas', contagem: contagens.recebida ?? 0 },
              { valor: 'em-analise', rotulo: 'Em análise', contagem: contagens['em-analise'] ?? 0 },
              { valor: 'aguardando-revisao', rotulo: 'Revisão', contagem: contagens['aguardando-revisao'] ?? 0 },
              { valor: 'liberada', rotulo: 'Liberadas', contagem: contagens.liberada ?? 0 },
              { valor: 'atrasadas', rotulo: 'Atrasadas', contagem: contagens.atrasadas },
            ]}
          />
        </div>
      </CabecalhoPagina>

      <Secao semPadding>
        <div className="px-5 pt-5">
          <BarraFiltros
            busca={busca} aoBuscar={setBusca}
            placeholder="Buscar por protocolo, fazenda, talhão, cultura ou cliente…"
          />
        </div>
        <Tabela
          colunas={[
            {
              chave: 'protocolo', titulo: 'Protocolo', valor: (a) => a.protocolo,
              render: (a) => (
                <span className="flex items-center gap-2">
                  <span className="num text-xs font-medium text-foreground">{a.protocolo}</span>
                  {a.prioridade !== 'normal' && (
                    <Pilula tom={a.prioridade === 'emergencial' ? 'erro' : 'alerta'} className="px-1.5 py-0 text-[0.58rem]">
                      {a.prioridade}
                    </Pilula>
                  )}
                  {!a.conformeNoRecebimento && <TriangleAlert className="h-3 w-3 text-[hsl(var(--warning))]" />}
                </span>
              ),
            },
            {
              chave: 'cliente', titulo: 'Cliente', valor: (a) => clientePorId.get(a.clienteId)?.nome ?? '',
              render: (a) => <span className="truncate text-xs">{clientePorId.get(a.clienteId)?.nomeFantasia}</span>,
            },
            {
              chave: 'grupo', titulo: 'Grupo', secundaria: true,
              render: (a) => <span className="text-xs text-muted-foreground">{grupoPorId.get(a.grupoId)?.nome}</span>,
            },
            {
              chave: 'identificacao', titulo: 'Identificação de campo',
              render: (a) => (
                <span className="block min-w-0">
                  <span className="block truncate text-xs text-foreground">{a.identificacaoCampo}</span>
                  {a.profundidade && (
                    <span className="num block text-[0.66rem] text-muted-foreground">{a.profundidade}{a.cultura ? ` · ${a.cultura}` : ''}</span>
                  )}
                </span>
              ),
            },
            {
              chave: 'status', titulo: 'Status', valor: (a) => a.status,
              render: (a) => <Pilula tom={TOM[a.status]} className="px-1.5 py-0 text-[0.62rem]">{ROTULO[a.status]}</Pilula>,
            },
            {
              chave: 'prazo', titulo: 'Prazo', alinhamento: 'direita', valor: (a) => a.prazoEntrega,
              render: (a) => {
                const atrasada = !['liberada', 'cancelada'].includes(a.status) && new Date(a.prazoEntrega) < new Date();
                return (
                  <span className={cn('num text-xs', atrasada ? 'text-destructive' : 'text-muted-foreground')}>
                    {fData(a.prazoEntrega)}
                  </span>
                );
              },
            },
          ]}
          dados={listadas.slice(0, 120)}
          chaveDe={(a) => a.id}
          aoClicar={(a) => setSelecionadaId(a.id)}
          ordenacaoInicial={{ chave: 'prazo', direcao: 'asc' }}
          vazio={<Vazio icone={TestTubes} titulo="Nenhuma amostra encontrada" descricao="Ajuste os filtros ou o termo de busca." />}
        />
        {listadas.length > 120 && (
          <p className="num border-t border-[hsl(var(--line-soft))] px-5 py-3 text-center text-xs text-muted-foreground">
            mostrando 120 de {listadas.length} amostras
          </p>
        )}
      </Secao>

      <DetalheAmostra amostraId={selecionadaId} aoFechar={() => setSelecionadaId(null)} podeAprovar={pode('analises:aprovar')} />
    </>
  );
}

/* ---------------- Painel lateral de detalhe ---------------- */

function DetalheAmostra({
  amostraId, aoFechar, podeAprovar,
}: { amostraId: string | null; aoFechar: () => void; podeAprovar: boolean }) {
  const { estado, usuario, papel } = useBancada();
  const { aprovarEnsaio, repetirEnsaio, mudarStatusAmostra } = useAcoes();
  const { clientePorId, grupoPorId, parametroPorId, usuarioPorId, equipamentoPorId } = useIndices();

  /* Resolver pelo id, e não guardar o objeto, é o que faz a edição
     aparecer sem fechar e reabrir a gaveta: o estado é a fonte. */
  const amostra = useMemo(
    () => estado.amostras.find((a) => a.id === amostraId) ?? null,
    [estado.amostras, amostraId],
  );

  const ensaios = useMemo(
    () => (amostra ? estado.ensaios.filter((e) => e.amostraId === amostra.id) : []),
    [estado.ensaios, amostra],
  );

  const leituraDestaque = useMemo(() => {
    const comTrace = ensaios
      .map((e) => estado.leiturasPh.find((l) => l.id === e.leituraPhId))
      .find((l) => l?.trace && l.trace.length > 2);
    return comTrace;
  }, [ensaios, estado.leiturasPh]);

  if (!amostra) return null;

  const cliente = clientePorId.get(amostra.clienteId);
  const grupo = grupoPorId.get(amostra.grupoId);
  const lote = estado.lotesRecepcao.find((l) => l.id === amostra.loteRecepcaoId);

  const phSmp = ensaios.find((e) => parametroPorId.get(e.parametroId)?.extrator === 'SMP')?.valor;
  const todosAprovados = ensaios.length > 0 && ensaios.every((e) => e.status === 'aprovado');

  return (
    <Sheet open onOpenChange={(aberto) => { if (!aberto) aoFechar(); }}>
      <SheetContent className="bancada w-full overflow-hidden border-l border-[hsl(var(--line-soft))] bg-background p-0 sm:max-w-2xl">
        <ScrollArea className="h-full">
          <div className="p-6">
            <SheetHeader className="space-y-2 text-left">
              <div className="flex items-center gap-2">
                <Pilula tom={TOM[amostra.status]} pontinho>{ROTULO[amostra.status]}</Pilula>
                {amostra.prioridade !== 'normal' && (
                  <Pilula tom={amostra.prioridade === 'emergencial' ? 'erro' : 'alerta'}>{amostra.prioridade}</Pilula>
                )}
              </div>
              <SheetTitle className="font-display text-3xl tracking-tight">
                <span className="num">{amostra.protocolo}</span>
              </SheetTitle>
              <SheetDescription className="text-sm">
                {amostra.identificacaoCampo} · {grupo?.nome}
              </SheetDescription>
            </SheetHeader>

            {!amostra.conformeNoRecebimento && (
              <div className="mt-5 flex items-start gap-2.5 rounded-[var(--radius-sm)] border border-[hsl(var(--warning)/0.3)] bg-[hsl(var(--warning)/0.1)] px-3.5 py-3">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--warning))]" />
                <div>
                  <p className="text-xs font-medium text-[hsl(var(--warning))]">Não conformidade no recebimento</p>
                  <p className="mt-0.5 text-[0.7rem] leading-relaxed text-muted-foreground">{amostra.naoConformidade}</p>
                </div>
              </div>
            )}

            <div className="mt-6 panel p-5">
              <Campos
                itens={[
                  { rotulo: 'Cliente', valor: cliente?.nome ?? '—' },
                  { rotulo: 'Lote de recepção', valor: <span className="num">{lote?.numero ?? '—'}</span> },
                  { rotulo: 'Fazenda', valor: amostra.fazenda ?? '—' },
                  { rotulo: 'Talhão', valor: amostra.talhao ?? '—' },
                  { rotulo: 'Profundidade', valor: amostra.profundidade ?? '—' },
                  { rotulo: 'Cultura', valor: amostra.cultura ?? '—' },
                  { rotulo: 'Coleta', valor: fData(amostra.dataColeta) },
                  { rotulo: 'Recepção', valor: dataHora(amostra.dataRecepcao) },
                  { rotulo: 'Prazo de entrega', valor: fData(amostra.prazoEntrega) },
                  { rotulo: 'Posição na bandeja', valor: <span className="num">{amostra.posicaoBandeja ?? '—'}</span> },
                ]}
              />
            </div>

            {/* --- Resultados --- */}
            <div className="mt-6">
              <h3 className="label-micro mb-3">Determinações ({ensaios.length})</h3>
              <ul className="space-y-2">
                {ensaios.map((e) => (
                  <LinhaEnsaio
                    key={e.id}
                    ensaio={e}
                    podeAprovar={podeAprovar}
                    aoAprovar={() => {
                      const v = podeAprovarEnsaio(papel, usuario, e.analistaId);
                      if (!v.permitido) { toast.error('Aprovação bloqueada', { description: v.motivo }); return; }
                      aprovarEnsaio(e.id);
                      toast.success('Resultado aprovado.');
                    }}
                    aoRepetir={() => {
                      repetirEnsaio(e.id, 'Repetição solicitada na revisão técnica');
                      toast.info('Ensaio devolvido para a bancada.');
                    }}
                  />
                ))}
              </ul>
            </div>

            {/* --- Interpretação agronômica --- */}
            {amostra.grupoId === 'solo' && (
              <Interpretacao ensaios={ensaios} phSmp={phSmp} />
            )}

            {/* --- Trace --- */}
            {leituraDestaque?.trace && (
              <div className="mt-6">
                <h3 className="label-micro mb-3">Curva de estabilização registrada</h3>
                <div className="panel p-4">
                  <GraficoTrace trace={leituraDestaque.trace} altura={160} />
                  <div className="mt-3 grid grid-cols-2 gap-3 border-t border-[hsl(var(--line-soft))] pt-3 sm:grid-cols-4">
                    <Mini rotulo="Equipamento" valor={equipamentoPorId.get(leituraDestaque.equipamentoId)?.tag ?? '—'} />
                    <Mini rotulo="Analista" valor={usuarioPorId.get(leituraDestaque.analistaId)?.nome.split(' ')[0] ?? '—'} />
                    <Mini rotulo="Estabilizou em" valor={duracao(leituraDestaque.tempoEstabilizacaoS)} />
                    <Mini rotulo="Deriva" valor={`${numero(leituraDestaque.derivaMvPorMin, 2)} mV/min`} />
                  </div>
                </div>
              </div>
            )}

            {/* --- Ações de fluxo --- */}
            <div className="mt-6 flex flex-wrap gap-2 border-t border-[hsl(var(--line-soft))] pt-5">
              {podeAprovar && amostra.status === 'aguardando-revisao' && todosAprovados && (
                <Button
                  onClick={() => { mudarStatusAmostra(amostra.id, 'liberada'); toast.success('Amostra liberada para laudo.'); }}
                  className="gap-2"
                >
                  <CheckCheck className="h-4 w-4" /> Liberar amostra
                </Button>
              )}
              {podeAprovar && amostra.status !== 'cancelada' && amostra.status !== 'liberada' && (
                <Button
                  variant="outline"
                  onClick={() => { mudarStatusAmostra(amostra.id, 'em-analise'); toast.info('Amostra devolvida à bancada.'); }}
                  className="gap-2"
                >
                  <RotateCcw className="h-4 w-4" /> Devolver à bancada
                </Button>
              )}
            </div>

            <AcoesAmostra amostra={amostra} />
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function LinhaEnsaio({
  ensaio, podeAprovar, aoAprovar, aoRepetir,
}: { ensaio: Ensaio; podeAprovar: boolean; aoAprovar: () => void; aoRepetir: () => void }) {
  const { parametroPorId, usuarioPorId } = useIndices();
  const p = parametroPorId.get(ensaio.parametroId);
  if (!p) return null;

  const tom: TomStatus =
    ensaio.status === 'aprovado' ? 'sucesso'
    : ensaio.status === 'revisado' ? 'info'
    : ensaio.status === 'repetir' ? 'erro'
    : ensaio.status === 'pendente' ? 'neutro' : 'alerta';

  return (
    <li className="panel p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
            {p.nome}
            {p.ehPh && <Pilula tom="primario" className="px-1.5 py-0 text-[0.58rem]">pH</Pilula>}
          </p>
          <p className="mt-0.5 truncate text-[0.68rem] text-muted-foreground">{p.metodo}</p>
          {ensaio.analistaId && (
            <p className="mt-1 text-[0.66rem] text-muted-foreground/70">
              {usuarioPorId.get(ensaio.analistaId)?.nome}
              {ensaio.dataLeitura && ` · ${tempoRelativo(ensaio.dataLeitura)}`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {ensaio.valor !== undefined ? (
            p.ehPh ? (
              <ChipPh valor={ensaio.valor} extrator={p.extrator ?? 'H2O'} tamanho="lg" />
            ) : (
              <span className="num text-lg font-semibold text-foreground">
                {numero(ensaio.valor, p.casasDecimais)}
                <span className="ml-1 text-xs font-normal text-muted-foreground">{p.unidade}</span>
              </span>
            )
          ) : (
            <span className="num text-sm text-muted-foreground">—</span>
          )}
          <Pilula tom={tom} className="px-1.5 py-0 text-[0.62rem]">{ensaio.status}</Pilula>
        </div>
      </div>

      {p.ehPh && ensaio.valor !== undefined && (
        <div className="mt-3.5">
          <ReguaPh valor={ensaio.valor} extrator={p.extrator ?? 'H2O'} compacta />
        </div>
      )}

      {ensaio.foraDeFaixa && (
        <p className="mt-2.5 text-[0.68rem] text-destructive">
          Resultado fora da faixa analítica declarada para o método.
        </p>
      )}

      {podeAprovar && (ensaio.status === 'lido' || ensaio.status === 'revisado') && (
        <div className="mt-3.5 flex gap-2 border-t border-[hsl(var(--line-soft))] pt-3">
          <Button size="sm" variant="outline" onClick={aoAprovar} className="h-7 gap-1.5 text-xs">
            <CheckCheck className="h-3.5 w-3.5" /> Aprovar
          </Button>
          <Button size="sm" variant="ghost" onClick={aoRepetir} className="h-7 gap-1.5 text-xs">
            <RotateCcw className="h-3.5 w-3.5" /> Repetir
          </Button>
        </div>
      )}
    </li>
  );
}

function Interpretacao({ ensaios, phSmp }: { ensaios: Ensaio[]; phSmp?: number }) {
  const { parametroPorId } = useIndices();
  const phAgua = ensaios.find((e) => parametroPorId.get(e.parametroId)?.extrator === 'H2O')?.valor;
  if (phAgua === undefined && phSmp === undefined) return null;

  const faixa = phAgua !== undefined ? classificarPh(phAgua, 'H2O') : undefined;
  const hAl = phSmp !== undefined ? hMaisAlPorSmp(phSmp) : undefined;

  return (
    <div className="mt-6">
      <h3 className="label-micro mb-3">Interpretação agronômica</h3>
      <div className="panel space-y-4 p-5">
        {phAgua !== undefined && faixa && (
          <div>
            <ReguaPh valor={phAgua} extrator="H2O" faixaIdeal={[5.5, 6.0]} />
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              A faixa tracejada marca o intervalo de 5,5 a 6,0, em que a disponibilidade da maioria dos
              nutrientes é máxima e o alumínio trocável fica praticamente neutralizado.
            </p>
          </div>
        )}
        {hAl !== undefined && (
          <div className="border-t border-[hsl(var(--line-soft))] pt-4">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Acidez potencial estimada pelo índice SMP <span className="num">{numero(phSmp ?? 0, 2)}</span>
              </p>
              <p className="num text-sm font-semibold text-foreground">
                {numero(hAl, 2)} <span className="text-[0.66rem] font-normal text-muted-foreground">cmolc/dm³</span>
              </p>
            </div>
            <p className="mt-1.5 text-[0.68rem] leading-relaxed text-muted-foreground">
              Calculada por H+Al = e^(7,76 − 1,053 · pH<sub>SMP</sub>), conforme CFSEMG.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Mini({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <p className="label-micro mb-0.5">{rotulo}</p>
      <p className="num text-xs text-foreground">{valor}</p>
    </div>
  );
}

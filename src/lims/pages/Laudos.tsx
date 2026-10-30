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
import { data as fData, dataExtenso, numero, tempoRelativo } from '../lib/format';
import { classificarPh } from '../lib/ph';
import {
  BarraFiltros, CabecalhoPagina, Indicador, Pilula, Secao, Segmentos, Tabela, Vazio, filtrar,
} from '../components/primitivos';
import { ChipPh } from '../components/ph-visual';
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
  const { clientePorId, grupoPorId, usuarioPorId, parametroPorId } = useIndices();

  const amostras = useMemo(
    () => (laudo ? estado.amostras.filter((a) => laudo.amostraIds.includes(a.id)) : []),
    [estado.amostras, laudo],
  );

  const assinante = laudo?.assinadoPorId ? usuarioPorId.get(laudo.assinadoPorId) : undefined;

  const parametrosUsados = useMemo(() => {
    const ids = new Set<string>();
    for (const a of amostras) {
      for (const e of estado.ensaios.filter((x) => x.amostraId === a.id && x.status === 'aprovado')) {
        ids.add(e.parametroId);
      }
    }
    return [...ids].map((id) => parametroPorId.get(id)!).filter(Boolean);
  }, [amostras, estado.ensaios, parametroPorId]);

  if (!laudo) return null;
  const cliente = clientePorId.get(laudo.clienteId);
  const grupo = grupoPorId.get(laudo.grupoId);

  return (
    <Sheet open onOpenChange={(a) => { if (!a) aoFechar(); }}>
      <SheetContent className="bancada w-full overflow-hidden border-l border-[hsl(var(--line-soft))] bg-background p-0 sm:max-w-3xl">
        <ScrollArea className="h-full">
          <div className="p-6">
            <SheetHeader className="space-y-2 text-left">
              <Pilula tom={TOM[laudo.status]} pontinho>{ROTULO[laudo.status]}</Pilula>
              <SheetTitle className="font-display text-3xl tracking-tight">
                <span className="num">{laudo.numero}</span>
              </SheetTitle>
              <SheetDescription className="text-sm">
                {cliente?.nome} · {grupo?.nome} · {amostras.length} amostras
              </SheetDescription>
            </SheetHeader>

            {/* --- Papel timbrado --- */}
            <div className="mt-6 panel overflow-hidden">
              <div className="border-b border-[hsl(var(--line-soft))] bg-[hsl(var(--surface-sunken))] px-6 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-display text-xl leading-tight text-foreground">{unidade.nome}</p>
                    <p className="num mt-1 text-[0.68rem] text-muted-foreground">
                      CNPJ {unidade.cnpj} · {unidade.municipio}/{unidade.uf}
                    </p>
                    <p className="mt-0.5 text-[0.68rem] text-muted-foreground">{unidade.acreditacao}</p>
                  </div>
                  <div className="text-right">
                    <p className="label-micro">Laudo nº</p>
                    <p className="num text-sm font-semibold text-foreground">{laudo.numero}</p>
                    <p className="num mt-1 text-[0.66rem] text-muted-foreground">versão {laudo.versao}</p>
                  </div>
                </div>
                <span className="ph-spectrum mt-4 block h-px w-full opacity-60" aria-hidden />
              </div>

              <div className="px-6 py-5">
                <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                  <Linha rotulo="Cliente" valor={cliente?.nome ?? '—'} />
                  <Linha rotulo="CNPJ" valor={cliente?.documento ?? '—'} mono />
                  <Linha rotulo="Município" valor={`${cliente?.municipio ?? ''}/${cliente?.uf ?? ''}`} />
                  <Linha rotulo="Grupo de análise" valor={grupo?.nome ?? '—'} />
                  <Linha rotulo="Emissão" valor={laudo.emitidoEm ? dataExtenso(laudo.emitidoEm) : 'não emitido'} />
                  <Linha rotulo="Código de verificação" valor={laudo.hashDocumento ?? '—'} mono />
                </div>

                {/* --- Tabela de resultados --- */}
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[hsl(var(--line-strong))]">
                        <th className="label-micro px-2 py-2 text-left">Protocolo</th>
                        <th className="label-micro px-2 py-2 text-left">Identificação</th>
                        {parametrosUsados.map((p) => (
                          <th key={p.id} className="label-micro px-2 py-2 text-right">
                            {p.codigo}
                            {p.unidade && <span className="ml-0.5 normal-case">({p.unidade})</span>}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {amostras.map((a) => (
                        <tr key={a.id} className="border-b border-[hsl(var(--line-soft))]">
                          <td className="num px-2 py-2 text-foreground">{a.protocolo}</td>
                          <td className="max-w-[12rem] truncate px-2 py-2 text-muted-foreground">{a.identificacaoCampo}</td>
                          {parametrosUsados.map((p) => {
                            const e = estado.ensaios.find(
                              (x) => x.amostraId === a.id && x.parametroId === p.id && x.status === 'aprovado',
                            );
                            return (
                              <td key={p.id} className="px-2 py-2 text-right">
                                {e?.valor === undefined ? (
                                  <span className="text-muted-foreground">—</span>
                                ) : p.ehPh ? (
                                  <ChipPh valor={e.valor} extrator={p.extrator ?? 'H2O'} tamanho="sm" />
                                ) : (
                                  <span className="num text-foreground">{numero(e.valor, p.casasDecimais)}</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* --- Interpretação do pH --- */}
                {parametrosUsados.some((p) => p.ehPh) && (
                  <div className="mt-6 rounded-[var(--radius-sm)] border border-[hsl(var(--line-soft))] bg-[hsl(var(--surface-sunken))] p-4">
                    <p className="label-micro mb-2.5">Interpretação da acidez</p>
                    <ul className="space-y-1.5">
                      {amostras.slice(0, 6).map((a) => {
                        const pPh = parametrosUsados.find((p) => p.ehPh);
                        const e = estado.ensaios.find(
                          (x) => x.amostraId === a.id && x.parametroId === pPh?.id && x.status === 'aprovado',
                        );
                        if (!e?.valor || !pPh) return null;
                        const f = classificarPh(e.valor, pPh.extrator ?? 'H2O');
                        return (
                          <li key={a.id} className="flex items-center gap-2.5 text-[0.7rem]">
                            <span className="num w-20 shrink-0 text-muted-foreground">{a.protocolo}</span>
                            <ChipPh valor={e.valor} extrator={pPh.extrator ?? 'H2O'} tamanho="sm" />
                            <span className="truncate text-muted-foreground">{f.rotulo} — {f.descricao}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {/* --- Métodos --- */}
                <div className="mt-6 border-t border-[hsl(var(--line-soft))] pt-4">
                  <p className="label-micro mb-2.5">Métodos empregados</p>
                  <ul className="space-y-1">
                    {parametrosUsados.map((p) => (
                      <li key={p.id} className="text-[0.68rem] leading-relaxed text-muted-foreground">
                        <span className="num text-foreground">{p.codigo}</span> — {p.nome}: {p.metodo}
                        {p.incerteza !== undefined && ` · incerteza expandida ±${numero(p.incerteza, 2)}`}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* --- Assinatura --- */}
                <div className="mt-8 flex items-end justify-between gap-6 border-t border-[hsl(var(--line-soft))] pt-6">
                  <p className="max-w-sm text-[0.62rem] leading-relaxed text-muted-foreground">
                    Os resultados referem-se exclusivamente às amostras recebidas e identificadas neste
                    documento. A reprodução parcial deste laudo só é permitida com autorização escrita do
                    laboratório.
                  </p>
                  <div className="shrink-0 text-center">
                    <div className="mb-1.5 h-10 w-44 border-b border-[hsl(var(--line-strong))]" />
                    <p className="text-[0.68rem] font-medium text-foreground">
                      {assinante?.nome ?? unidade.responsavelTecnico}
                    </p>
                    {/* O registro é da pessoa que assina, não da unidade:
                        laudo com o nome de um e o CRQ de outro não se
                        sustenta numa auditoria. */}
                    <p className="num text-[0.62rem] text-muted-foreground">
                      {assinante?.crq ?? unidade.crq}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* --- Ações --- */}
            <div className="mt-6 flex flex-wrap gap-2">
              {podeEmitir && laudo.status !== 'emitido' && (
                <Button
                  onClick={() => { emitirLaudo(laudo.id); toast.success(`${laudo.numero} assinado e emitido.`); }}
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
              <p className="mt-4 flex items-center gap-2 text-[0.68rem] text-muted-foreground">
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

function Linha({ rotulo, valor, mono }: { rotulo: string; valor: string; mono?: boolean }) {
  return (
    <div>
      <p className="label-micro mb-0.5">{rotulo}</p>
      <p className={mono ? 'num text-xs text-foreground' : 'text-xs text-foreground'}>{valor}</p>
    </div>
  );
}

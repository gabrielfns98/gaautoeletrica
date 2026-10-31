/* ============================================================
   BANCADA — emissão de laudos
   ============================================================ */

import { useMemo, useState } from 'react';
import { FileCheck2, Mail, PenLine, Printer, ShieldCheck, Sprout } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';

import { useAcoes, useBancada, useIndices } from '../data/store';
import { modeloDoLaudo, montarLaudo, ordenarPeloModelo } from './laudo/montar';
import { FolhaLaudo } from './laudo/Folha';
import { FolhaFoliar } from './laudo/Foliar';
import { FolhaAnalitica } from './laudo/Analitico';
import { FolhaRecomendacao } from './laudo/Recomendacao';
import type { Disposicao } from './laudo/Folha';
import { data as fData, tempoRelativo } from '../lib/format';
import {
  calcularRelacoes, conferirLaudo, faixaAdequada, podeEmitir as laudoLiberado,
} from '../lib/resultado';
import { codigoDaCultura, recomendar, soloDosResultados, tabelaPadrao } from '../lib/recomendacao';
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
  const [abertoId, setAbertoId] = useState<string | null>(null);

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
          aoClicar={(l) => setAbertoId(l.id)}
          ordenacaoInicial={{ chave: 'emissao', direcao: 'desc' }}
          vazio={<Vazio icone={FileCheck2} titulo="Nenhum laudo encontrado" />}
        />
      </Secao>

      <PreVisualizacao laudoId={abertoId} aoFechar={() => setAbertoId(null)} podeEmitir={pode('laudos:aprovar')} />
    </>
  );
}

/**
 * Abre a impressão do navegador, que é por onde sai o PDF.
 *
 * O Chrome batiza o arquivo salvo com o título da página, então o
 * título vira o número do laudo durante a impressão: o laboratório
 * recebe "LA-2026-03169.pdf" em vez de "Bancada — Gestão
 * laboratorial.pdf", que é o que o cliente arquiva.
 */
function baixarPdf(numero: string) {
  const original = document.title;
  document.title = numero;
  const restaurar = () => { document.title = original; };
  window.addEventListener('afterprint', restaurar, { once: true });
  window.print();
  // Navegador que não dispara afterprint não pode ficar com o título trocado.
  window.setTimeout(restaurar, 2000);
}

/* ---------------- Pré-visualização ---------------- */

function PreVisualizacao({
  laudoId, aoFechar, podeEmitir,
}: { laudoId: string | null; aoFechar: () => void; podeEmitir: boolean }) {
  const { estado, unidade } = useBancada();
  const { emitirLaudo } = useAcoes();
  const { clientePorId, grupoPorId, usuarioPorId } = useIndices();

  const [disposicao, setDisposicao] = useState<Disposicao | undefined>();

  /* Parâmetros da recomendação. São escolha do agrônomo, não do
     laudo: o mesmo solo recomendado para 60 ou para 90 sacas dá
     doses diferentes, e as duas estão certas. */
  const [anexarRecomendacao, setAnexarRecomendacao] = useState(true);
  const [tabelaEscolhida, setTabelaEscolhida] = useState<string | undefined>();
  const [prnt, setPrnt] = useState(85);
  const [profundidade, setProfundidade] = useState<number | undefined>();

  /* Pelo id, não pelo objeto: assinar tem de mudar a folha na hora. */
  const laudo = useMemo(
    () => estado.laudos.find((l) => l.id === laudoId) ?? null,
    [estado.laudos, laudoId],
  );

  const modelo = useMemo(
    () => modeloDoLaudo(estado.modelosLaudo, unidade.id, laudo?.grupoId),
    [estado.modelosLaudo, unidade.id, laudo?.grupoId],
  );

  const montado = useMemo(() => {
    if (!laudo) return undefined;
    return montarLaudo({
      laudo,
      amostras: estado.amostras,
      ensaios: estado.ensaios,
      /* A ordem entra aqui, antes da montagem: é o array de parâmetros
         que define a sequência das colunas da matriz e também das
         linhas de cada amostra. Reordenar só o resultado arrumaria a
         matriz e deixaria a tabela por amostra na ordem do cadastro. */
      parametros: ordenarPeloModelo(estado.parametros, modelo.ordemParametros),
      legendas: estado.legendas,
      // A legenda por cultura vale quando o laboratório cadastrou uma:
      // fósforo "baixo" para pastagem pode ser "médio" para soja.
      culturaDe: (a) => a.cultura,
    });
  }, [laudo, estado.amostras, estado.ensaios, estado.parametros, estado.legendas, modelo]);

  /* Relações entre elementos, uma lista por amostra. Só o laudo
     foliar as imprime, então só ele paga a conta. */
  const relacoes = useMemo(() => {
    const mapa = new Map<string, ReturnType<typeof calcularRelacoes>>();
    if (!montado || modelo.layout !== 'foliar') return mapa;
    for (const { amostra, resultados } of montado.amostras) {
      const valores: Record<string, { valor: number | undefined; unidade: string }> = {};
      for (const r of resultados) {
        const chave = r.parametro.codigo.replace(/-(FOL|FOLIAR)$/i, '').toUpperCase();
        valores[chave] = { valor: r.ensaio.valor, unidade: r.parametro.unidade };
      }
      mapa.set(amostra.id, calcularRelacoes(valores));
    }
    return mapa;
  }, [montado, modelo.layout]);

  /* O que impede a assinatura. A faixa da cultura é obrigatória no
     laudo foliar: sem ela o documento sai com intervalo inventado. */
  const problemas = useMemo(() => {
    if (!montado) return [];
    return montado.amostras.flatMap(({ amostra, resultados }) =>
      conferirLaudo({
        cultura: amostra.cultura,
        itens: resultados.map((r) => ({
          codigo: r.parametro.codigo,
          valor: r.ensaio.valor,
          lq: r.parametro.lq,
          // A faixa que importa é a adequada da legenda da cultura,
          // não aquela em que o resultado caiu.
          faixa: faixaAdequada(r.interpretacao?.legenda.faixas),
          exigeFaixa: modelo.layout === 'foliar',
          metodo: r.parametro.metodo,
        })),
      }).map((p) => ({ ...p, onde: `${amostra.protocolo}: ${p.onde ?? ''}` })));
  }, [montado, modelo.layout]);

  /* A tabela de referência: a escolhida, ou a da UF do cliente, ou
     a marcada como padrão. */
  const tabela = useMemo(() => {
    const escolhida = estado.tabelasRecomendacao.find((t) => t.id === tabelaEscolhida);
    if (escolhida) return escolhida;
    const uf = laudo ? clientePorId.get(laudo.clienteId)?.uf : undefined;
    return tabelaPadrao(estado.tabelasRecomendacao, uf);
  }, [estado.tabelasRecomendacao, tabelaEscolhida, laudo, clientePorId]);

  /* A recomendação, uma por amostra.
     Só para solo: recomendar calagem a partir de um laudo de
     fertilizante ou de tecido vegetal não significa nada — o
     extrator, as unidades e as faixas são de outro ensaio. */
  const recomendacoes = useMemo(() => {
    if (!montado || !tabela || laudo?.grupoId !== 'solo') return [];
    return montado.amostras
      .map((item) => ({
        item,
        recomendacao: recomendar(
          soloDosResultados(item.resultados.map((r) => ({
            codigo: r.parametro.codigo, valor: r.ensaio.valor,
          }))),
          tabela,
          estado.recomendacoesCultura,
          /* A amostra guarda o nome da cultura; o cadastro de
             recomendação usa o código. A resolução passa pelo
             cadastro de culturas, que conhece os dois. */
          codigoDaCultura(estado.culturas, item.amostra.cultura),
          { prnt, profundidade, produtividade: item.amostra.produtividadeEsperada },
        ),
      }))
      // Amostra sem nada calculável não ganha folha em branco.
      .filter(({ recomendacao }) => !recomendacao.vazia);
  }, [montado, tabela, laudo?.grupoId, estado.recomendacoesCultura, estado.culturas, prnt, profundidade]);

  /* O modelo escolhe quais observações entram e em que ordem; sem
     escolha, valem as ativas do cadastro. */
  const observacoes = useMemo(() => {
    const ativas = estado.observacoesFixas.filter((o) => o.ativo);
    if (modelo.observacaoIds.length === 0) return ativas.slice(0, 3);
    return modelo.observacaoIds
      .map((id) => ativas.find((o) => o.id === id))
      .filter((o): o is NonNullable<typeof o> => Boolean(o));
  }, [estado.observacoesFixas, modelo]);

  if (!laudo || !montado) return null;

  const comoMostrar = disposicao ?? modelo.disposicaoPadrao;

  /* Solicitante é quem pediu a análise: o contato do cliente, não
     alguém do laboratório. */
  const solicitante = estado.contatos.find((c) => c.clienteId === laudo.clienteId && c.principal)?.nome
    ?? estado.contatos.find((c) => c.clienteId === laudo.clienteId)?.nome;

  const cliente = clientePorId.get(laudo.clienteId);
  const grupo = grupoPorId.get(laudo.grupoId);
  const assinante = laudo.assinadoPorId ? usuarioPorId.get(laudo.assinadoPorId) : undefined;

  return (
    <Sheet open onOpenChange={(a) => { if (!a) aoFechar(); }}>
      <SheetContent className="bancada w-full overflow-hidden border-l border-[hsl(var(--line-soft))] bg-background p-0 sm:max-w-4xl">
        <ScrollArea className="h-full">
          <div className="p-6">
            <SheetHeader className="space-y-2 text-left sem-impressao">
              <Pilula tom={TOM[laudo.status]} pontinho>{ROTULO[laudo.status]}</Pilula>
              <SheetTitle className="font-display text-3xl tracking-tight">
                <span className="num">{laudo.numero}</span>
              </SheetTitle>
              <SheetDescription className="text-sm">
                {cliente?.nome} · {grupo?.nome} · {montado.amostras.length} amostras ·{' '}
                <span className="num">{montado.totalResultados}</span> determinações
              </SheetDescription>
            </SheetHeader>

            {montado.totalResultados > 0 && modelo.layout === 'generico' && (
              <div className="mt-5 sem-impressao">
                <Segmentos
                  valor={comoMostrar}
                  aoMudar={setDisposicao}
                  opcoes={[
                    { valor: 'amostra', rotulo: 'Por amostra' },
                    { valor: 'matriz', rotulo: 'Matriz do lote' },
                  ]}
                />
              </div>
            )}

            <div className="mt-6">
              {modelo.layout === 'analitico' ? (
                <FolhaAnalitica
                  laudo={laudo}
                  montado={montado}
                  cliente={cliente}
                  unidade={unidade}
                  assinante={assinante}
                  observacoes={observacoes}
                  modelo={modelo}
                  solicitante={solicitante}
                />
              ) : modelo.layout === 'foliar' ? (
                <FolhaFoliar
                  laudo={laudo}
                  montado={montado}
                  cliente={cliente}
                  unidade={unidade}
                  assinante={assinante}
                  observacoes={observacoes}
                  modelo={modelo}
                  lote={estado.lotesRecepcao.find((l) => l.id === montado.amostras[0]?.amostra.loteRecepcaoId)}
                  solicitante={solicitante}
                  relacoes={relacoes}
                />
              ) : (
                <FolhaLaudo
                  laudo={laudo}
                  montado={montado}
                  cliente={cliente}
                  grupo={grupo}
                  unidade={unidade}
                  assinante={assinante}
                  observacoes={observacoes}
                  disposicao={comoMostrar}
                  modelo={modelo}
                />
              )}
            </div>

            {/* --- Recomendação agronômica --- */}
            {recomendacoes.length > 0 && (
              <>
                <div className="mt-6 rounded-[var(--radius-md)] border border-[hsl(var(--line))] p-4 sem-impressao">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-sm text-foreground">
                      <input
                        type="checkbox"
                        checked={anexarRecomendacao}
                        onChange={(e) => setAnexarRecomendacao(e.target.checked)}
                        className="h-4 w-4 accent-[hsl(var(--accent))]"
                      />
                      <Sprout className="h-4 w-4 text-muted-foreground" />
                      Anexar recomendação de calagem e adubação
                      <span className="num text-xs text-muted-foreground">
                        ({recomendacoes.length} {recomendacoes.length === 1 ? 'amostra' : 'amostras'})
                      </span>
                    </label>
                  </div>

                  {anexarRecomendacao && (
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <label className="text-xs text-muted-foreground">
                        Tabela de referência
                        <select
                          value={tabela?.id ?? ''}
                          onChange={(e) => setTabelaEscolhida(e.target.value)}
                          className="mt-1 w-full rounded-[var(--radius-sm)] border border-[hsl(var(--line))] bg-[hsl(var(--surface-sunken))] px-2 py-1.5 text-xs text-foreground"
                        >
                          {estado.tabelasRecomendacao.filter((t) => t.ativa).map((t) => (
                            <option key={t.id} value={t.id}>{t.nome} ({t.regiao})</option>
                          ))}
                        </select>
                      </label>
                      <label className="text-xs text-muted-foreground">
                        PRNT do corretivo (%)
                        <input
                          type="number" min={30} max={100} step={1} value={prnt}
                          onChange={(e) => setPrnt(Number(e.target.value) || 85)}
                          className="num mt-1 w-full rounded-[var(--radius-sm)] border border-[hsl(var(--line))] bg-[hsl(var(--surface-sunken))] px-2 py-1.5 text-xs text-foreground"
                        />
                      </label>
                      <label className="text-xs text-muted-foreground">
                        Incorporação (cm)
                        <input
                          type="number" min={5} max={60} step={5}
                          value={profundidade ?? tabela?.profundidadeIncorporacao ?? 20}
                          onChange={(e) => setProfundidade(Number(e.target.value) || undefined)}
                          className="num mt-1 w-full rounded-[var(--radius-sm)] border border-[hsl(var(--line))] bg-[hsl(var(--surface-sunken))] px-2 py-1.5 text-xs text-foreground"
                        />
                      </label>
                    </div>
                  )}
                </div>

                {anexarRecomendacao && tabela && (
                  <div className="mt-4">
                    <FolhaRecomendacao
                      laudo={laudo}
                      amostras={recomendacoes}
                      cliente={cliente}
                      unidade={unidade}
                      modelo={modelo}
                      nomeDaCultura={(codigo) =>
                        estado.culturas.find((c) => c.codigo === codigo)?.nome ?? codigo}
                    />
                  </div>
                )}
              </>
            )}

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
                    if (!laudoLiberado(problemas)) {
                      const impedem = problemas.filter((p) => p.gravidade === 'impede');
                      toast.error('O laudo não pode ser emitido', {
                        description: impedem[0].mensagem,
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
              <Button variant="outline" onClick={() => baixarPdf(laudo.numero)} className="gap-2">
                <Printer className="h-4 w-4" /> Imprimir / salvar PDF
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

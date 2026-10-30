/* ============================================================
   BANCADA — lançamento de resultados
   Filtra uma corrida e digita em grade: linhas são amostras,
   colunas são elementos. É assim que a bancada trabalha de
   verdade — lendo uma coluna de béqueres de cima para baixo,
   não uma amostra por vez.
   ============================================================ */

import { useCallback, useMemo, useRef, useState } from 'react';
import { Eraser, ListFilter, Save, Search, TableProperties, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { useAcoes, useBancada, useIndices } from '../data/store';
import { classificarPh, corDoPh } from '../lib/ph';
import { data as fData, numero } from '../lib/format';
import { CabecalhoPagina, Pilula, Secao, Segmentos, Vazio } from '../components/primitivos';
import type { TomStatus } from '../components/primitivos';
import type { Amostra, Ensaio, GrupoAnaliseId, Parametro, TipoAnalise } from '../types';

type Modo = 'lista' | 'lancamento';
type Situacao = 'pendente' | 'parcial' | 'lido' | 'aprovado';

const ROTULO_SIT: Record<Situacao, string> = {
  pendente: 'PENDENTE', parcial: 'PARCIAL', lido: 'LIDO', aprovado: 'APROVADO',
};
const TOM_SIT: Record<Situacao, TomStatus> = {
  pendente: 'info', parcial: 'alerta', lido: 'primario', aprovado: 'sucesso',
};

interface Filtros {
  codigoBarras: string;
  numeroAmostra: string;
  amostraInicial: string;
  amostraFinal: string;
  grupoId: string;
  tipoAnaliseId: string;
  unidadeId: string;
  de: string;
  ate: string;
  situacao: string;
}

const FILTROS_VAZIOS: Filtros = {
  codigoBarras: '', numeroAmostra: '', amostraInicial: '', amostraFinal: '',
  grupoId: 'todas', tipoAnaliseId: 'todos', unidadeId: 'todas',
  de: '', ate: '', situacao: 'pendentes',
};

/** Só os dígitos do protocolo, para comparar faixas e leitura de código de barras. */
const digitosProtocolo = (p: string) => Number(p.replace(/\D/g, '')) || 0;

export default function Resultados() {
  const { estado, unidade, pode } = useBancada();
  const { lancarResultados } = useAcoes();
  const { clientePorId, grupoPorId, parametroPorId, tipoAnalisePorId, ensaiosPorAmostra } = useIndices();

  const [filtros, setFiltros] = useState<Filtros>({ ...FILTROS_VAZIOS, unidadeId: unidade.id });
  const [aplicados, setAplicados] = useState<Filtros | null>(null);
  const [modo, setModo] = useState<Modo>('lista');
  const [valores, setValores] = useState<Record<string, string>>({});

  const mudar = (campo: keyof Filtros, valor: string) =>
    setFiltros((f) => ({ ...f, [campo]: valor }));

  const tiposDoGrupo = useMemo(
    () => estado.tiposAnalise.filter(
      (t) => filtros.grupoId === 'todas' || t.grupoId === filtros.grupoId),
    [estado.tiposAnalise, filtros.grupoId],
  );

  /* ---------------- consulta ---------------- */

  const encontradas = useMemo<Amostra[]>(() => {
    if (!aplicados) return [];
    const f = aplicados;
    const ini = f.amostraInicial ? digitosProtocolo(f.amostraInicial) : undefined;
    const fim = f.amostraFinal ? digitosProtocolo(f.amostraFinal) : undefined;
    const de = f.de ? new Date(`${f.de}T00:00:00`) : undefined;
    const ate = f.ate ? new Date(`${f.ate}T23:59:59`) : undefined;
    const busca = (f.codigoBarras || f.numeroAmostra).replace(/\D/g, '');

    return estado.amostras.filter((a) => {
      if (a.status === 'cancelada') return false;
      if (busca && !a.protocolo.replace(/\D/g, '').includes(busca)) return false;
      const n = digitosProtocolo(a.protocolo);
      if (ini !== undefined && n < ini) return false;
      if (fim !== undefined && n > fim) return false;
      if (f.grupoId !== 'todas' && a.grupoId !== f.grupoId) return false;
      if (f.tipoAnaliseId !== 'todos' && a.tipoAnaliseId !== f.tipoAnaliseId) return false;
      if (f.unidadeId !== 'todas' && a.unidadeId !== f.unidadeId) return false;
      const entrada = new Date(a.dataRecepcao);
      if (de && entrada < de) return false;
      if (ate && entrada > ate) return false;
      if (f.situacao === 'pendentes' && situacaoDa(a) === 'aprovado') return false;
      if (f.situacao !== 'pendentes' && f.situacao !== 'todas' && situacaoDa(a) !== f.situacao) return false;
      return true;
    }).sort((a, b) => digitosProtocolo(a.protocolo) - digitosProtocolo(b.protocolo));

    function situacaoDa(a: Amostra): Situacao {
      const lista = ensaiosPorAmostra.get(a.id) ?? [];
      if (lista.length === 0) return 'pendente';
      if (lista.every((e) => e.status === 'aprovado')) return 'aprovado';
      const comValor = lista.filter((e) => e.valor !== undefined).length;
      if (comValor === 0) return 'pendente';
      return comValor === lista.length ? 'lido' : 'parcial';
    }
  }, [aplicados, estado.amostras, ensaiosPorAmostra]);

  const situacao = useCallback((a: Amostra): Situacao => {
    const lista = ensaiosPorAmostra.get(a.id) ?? [];
    if (lista.length === 0) return 'pendente';
    if (lista.every((e) => e.status === 'aprovado')) return 'aprovado';
    const comValor = lista.filter((e) => e.valor !== undefined).length;
    if (comValor === 0) return 'pendente';
    return comValor === lista.length ? 'lido' : 'parcial';
  }, [ensaiosPorAmostra]);

  /**
   * As colunas da grade saem do pacote contratado. Amostras de pacotes
   * diferentes não cabem na mesma matriz, então cada pacote vira um bloco —
   * nenhuma linha fica escondida porque não coube.
   */
  const blocos = useMemo(() => {
    const porPacote = new Map<string, Amostra[]>();
    for (const a of encontradas) {
      const chave = a.tipoAnaliseId ?? `avulso:${a.grupoId}`;
      const lista = porPacote.get(chave) ?? [];
      lista.push(a);
      porPacote.set(chave, lista);
    }

    return [...porPacote.entries()].map(([chave, amostras]) => {
      const pacote: TipoAnalise | undefined = tipoAnalisePorId.get(chave);
      // sem pacote, as colunas saem da união dos ensaios abertos das amostras
      const ids = pacote
        ? pacote.parametroIds
        : [...new Set(amostras.flatMap((a) => (ensaiosPorAmostra.get(a.id) ?? []).map((e) => e.parametroId)))];
      const colunas = ids
        .map((id) => parametroPorId.get(id))
        .filter((p): p is Parametro => Boolean(p));
      return { chave, pacote, amostras, colunas };
    }).sort((a, b) => b.amostras.length - a.amostras.length);
  }, [encontradas, tipoAnalisePorId, parametroPorId, ensaiosPorAmostra]);

  /* ---------------- edição em grade ---------------- */

  const celulas = useRef(new Map<string, HTMLInputElement>());

  const registrarCelula = (chave: string) => (el: HTMLInputElement | null) => {
    if (el) celulas.current.set(chave, el);
    else celulas.current.delete(chave);
  };

  /** Enter e setas andam na coluna; é o movimento natural de quem lê a bancada. */
  const navegar = (bloco: string, linha: number, coluna: number, delta: number) => {
    const alvo = celulas.current.get(`${bloco}:${linha + delta}:${coluna}`);
    if (alvo) { alvo.focus(); alvo.select(); }
  };

  const ensaioDe = useCallback((amostraId: string, parametroId: string): Ensaio | undefined =>
    (ensaiosPorAmostra.get(amostraId) ?? []).find((e) => e.parametroId === parametroId),
  [ensaiosPorAmostra]);

  const pendencias = useMemo(() => {
    const lista: Array<{ ensaioId: string; valor: number }> = [];
    for (const [ensaioId, texto] of Object.entries(valores)) {
      const v = Number(texto.replace(',', '.'));
      if (texto.trim() !== '' && Number.isFinite(v)) lista.push({ ensaioId, valor: v });
    }
    return lista;
  }, [valores]);

  const gravar = () => {
    if (pendencias.length === 0) {
      toast.error('Nada para gravar.');
      return;
    }
    lancarResultados(pendencias);
    setValores({});
    toast.success(`${pendencias.length} ${pendencias.length === 1 ? 'resultado gravado' : 'resultados gravados'}`, {
      description: 'Os ensaios passaram para “lido” e seguem para revisão técnica.',
    });
  };

  const pesquisar = () => {
    setAplicados({ ...filtros });
    setValores({});
  };

  const limpar = () => {
    setFiltros({ ...FILTROS_VAZIOS, unidadeId: unidade.id });
    setAplicados(null);
    setValores({});
  };

  const podeLancar = pode('analises:editar');

  return (
    <>
      <CabecalhoPagina
        eyebrow="Análises"
        titulo="Resultados"
        descricao="Filtre a corrida e lance em grade. Enter e as setas andam na coluna, do jeito que a bancada é lida."
        acoes={
          aplicados && (
            <Segmentos
              valor={modo}
              aoMudar={setModo}
              opcoes={[
                { valor: 'lista', rotulo: 'Lista', contagem: encontradas.length },
                { valor: 'lancamento', rotulo: 'Lançamento' },
              ]}
            />
          )
        }
      />

      {/* ---------------- Filtros ---------------- */}
      <Secao className="mb-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Campo id="f-barras" rotulo="Código de barras" dica="bipe a etiqueta do copo">
            <Input
              id="f-barras"
              value={filtros.codigoBarras}
              onChange={(e) => mudar('codigoBarras', e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') pesquisar(); }}
              placeholder="26.014532" className="num h-9" autoFocus
            />
          </Campo>

          <Campo id="f-numero" rotulo="Nº da amostra">
            <Input
              id="f-numero"
              value={filtros.numeroAmostra}
              onChange={(e) => mudar('numeroAmostra', e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') pesquisar(); }}
              className="num h-9"
            />
          </Campo>

          <Campo id="f-ini" rotulo="Amostra inicial">
            <Input
              id="f-ini"
              value={filtros.amostraInicial}
              onChange={(e) => mudar('amostraInicial', e.target.value)}
              placeholder="26.014000" className="num h-9"
            />
          </Campo>

          <Campo id="f-fim" rotulo="Amostra final">
            <Input
              id="f-fim"
              value={filtros.amostraFinal}
              onChange={(e) => mudar('amostraFinal', e.target.value)}
              placeholder="26.014999" className="num h-9"
            />
          </Campo>

          <Campo id="f-grupo" rotulo="Análise">
            <Select
              value={filtros.grupoId}
              onValueChange={(v) => { mudar('grupoId', v); mudar('tipoAnaliseId', 'todos'); }}
            >
              <SelectTrigger id="f-grupo" className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-80">
                <SelectItem value="todas">Todas</SelectItem>
                {estado.grupos.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    <span className="uppercase">{g.nome}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>

          <Campo id="f-tipo" rotulo="Tipo de análise">
            <Select value={filtros.tipoAnaliseId} onValueChange={(v) => mudar('tipoAnaliseId', v)}>
              <SelectTrigger id="f-tipo" className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-80">
                <SelectItem value="todos">Todos</SelectItem>
                {tiposDoGrupo.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    <span className="num mr-2 text-[0.65rem] text-muted-foreground">{t.codigo}</span>
                    {t.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>

          <Campo id="f-empresa" rotulo="Empresa">
            <Select value={filtros.unidadeId} onValueChange={(v) => mudar('unidadeId', v)}>
              <SelectTrigger id="f-empresa" className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {estado.unidades.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    <span className="num mr-2 text-[0.65rem] text-muted-foreground">{u.codigo}</span>
                    {u.sigla} — {u.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>

          <Campo id="f-situacao" rotulo="Situação">
            <Select value={filtros.situacao} onValueChange={(v) => mudar('situacao', v)}>
              <SelectTrigger id="f-situacao" className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pendentes">Em aberto</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="parcial">Parcial</SelectItem>
                <SelectItem value="lido">Lido</SelectItem>
                <SelectItem value="aprovado">Aprovado</SelectItem>
                <SelectItem value="todas">Todas</SelectItem>
              </SelectContent>
            </Select>
          </Campo>

          <Campo id="f-de" rotulo="Entrada — de">
            <Input id="f-de" type="date" value={filtros.de} onChange={(e) => mudar('de', e.target.value)} className="num h-9" />
          </Campo>

          <Campo id="f-ate" rotulo="Entrada — até">
            <Input id="f-ate" type="date" value={filtros.ate} onChange={(e) => mudar('ate', e.target.value)} className="num h-9" />
          </Campo>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[hsl(var(--line-soft))] pt-5">
          <Button onClick={pesquisar} className="gap-2">
            <Search className="h-4 w-4" /> Pesquisar
          </Button>
          <Button variant="ghost" onClick={limpar} className="gap-2 text-xs">
            <Eraser className="h-3.5 w-3.5" /> limpar filtros
          </Button>
          {aplicados && (
            <span className="num ml-auto text-xs text-muted-foreground">
              {encontradas.length} {encontradas.length === 1 ? 'amostra' : 'amostras'}
              {blocos.length > 1 && ` · ${blocos.length} pacotes`}
            </span>
          )}
        </div>
      </Secao>

      {/* ---------------- Resultado da consulta ---------------- */}
      {!aplicados ? (
        <Secao>
          <Vazio
            icone={ListFilter}
            titulo="Defina a corrida"
            descricao="Bique o código de barras do copo, ou filtre por faixa de amostra, análise e data de entrada. O Enter no campo de código de barras já pesquisa."
          />
        </Secao>
      ) : encontradas.length === 0 ? (
        <Secao>
          <Vazio icone={Search} titulo="Nenhuma amostra nesse filtro" descricao="Confira a faixa, a análise e o período." />
        </Secao>
      ) : modo === 'lista' ? (
        <Secao semPadding>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-[hsl(var(--line-soft))]">
                  {['Amostra', 'Análise', 'Tipo de análise', 'Profundidade', 'Propriedade', 'Talhão', 'Cultura', 'Situação']
                    .map((t, i) => (
                      <th key={t} className={cn('label-micro whitespace-nowrap px-4 py-2.5 font-medium',
                        i === 7 ? 'text-right' : 'text-left')}>{t}</th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {encontradas.slice(0, 200).map((a) => {
                  const sit = situacao(a);
                  return (
                    <tr key={a.id} className="border-b border-[hsl(var(--line-soft))] last:border-0">
                      <td className="num whitespace-nowrap px-4 py-2.5 text-xs font-medium">{a.protocolo}</td>
                      <td className="px-4 py-2.5 text-xs uppercase text-muted-foreground">{grupoPorId.get(a.grupoId)?.nome}</td>
                      <td className="num px-4 py-2.5 text-xs">{a.tipoAnaliseId ? tipoAnalisePorId.get(a.tipoAnaliseId)?.codigo : '—'}</td>
                      <td className="num px-4 py-2.5 text-xs text-muted-foreground">{a.profundidade ?? '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{a.fazenda ?? clientePorId.get(a.clienteId)?.nomeFantasia ?? '—'}</td>
                      <td className="num px-4 py-2.5 text-xs text-muted-foreground">{a.talhao ?? '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{a.cultura ?? '—'}</td>
                      <td className="px-4 py-2.5 text-right">
                        <Pilula tom={TOM_SIT[sit]} className="px-1.5 py-0 text-[0.62rem]">{ROTULO_SIT[sit]}</Pilula>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {encontradas.length > 200 && (
            <p className="num border-t border-[hsl(var(--line-soft))] px-4 py-3 text-center text-xs text-muted-foreground">
              mostrando 200 de {encontradas.length} — estreite o filtro
            </p>
          )}
        </Secao>
      ) : (
        <div className="space-y-5">
          {!podeLancar && (
            <div className="flex items-start gap-2.5 rounded-[var(--radius-lg)] border border-[hsl(var(--warning)/0.3)] bg-[hsl(var(--warning)/0.08)] px-5 py-4">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--warning))]" />
              <p className="text-xs leading-relaxed text-foreground">
                Seu papel permite consultar, mas não lançar resultados. A grade está em leitura.
              </p>
            </div>
          )}

          {blocos.map((bloco) => (
            <Secao
              key={bloco.chave}
              titulo={bloco.pacote ? `${bloco.pacote.codigo} — ${bloco.pacote.nome}` : 'Ensaios avulsos'}
              descricao={`${bloco.amostras.length} ${bloco.amostras.length === 1 ? 'amostra' : 'amostras'} · ${bloco.colunas.length} ${bloco.colunas.length === 1 ? 'elemento' : 'elementos'}`}
              semPadding
            >
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[hsl(var(--line-soft))]">
                      <th className="label-micro sticky left-0 z-10 bg-[hsl(var(--card))] px-4 py-2.5 text-left font-medium">
                        Amostra
                      </th>
                      {bloco.colunas.map((p) => (
                        <th key={p.id} className="label-micro whitespace-nowrap px-2 py-2.5 text-center font-medium">
                          <span className="block" title={p.nome}>{p.codigo}</span>
                          {p.unidade && <span className="block normal-case opacity-60">{p.unidade}</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bloco.amostras.map((a, linha) => (
                      <tr key={a.id} className="border-b border-[hsl(var(--line-soft))] last:border-0">
                        <td className="sticky left-0 z-10 bg-[hsl(var(--card))] px-4 py-1.5">
                          <span className="num block whitespace-nowrap text-xs font-medium">{a.protocolo}</span>
                          <span className="block max-w-[11rem] truncate text-[0.64rem] text-muted-foreground">
                            {a.identificacaoCampo}
                          </span>
                        </td>
                        {bloco.colunas.map((p, coluna) => {
                          const ensaio = ensaioDe(a.id, p.id);
                          return (
                            <Celula
                              key={p.id}
                              ensaio={ensaio}
                              parametro={p}
                              valor={ensaio ? valores[ensaio.id] : undefined}
                              somenteLeitura={!podeLancar || !ensaio || ensaio.status === 'aprovado'}
                              refCelula={registrarCelula(`${bloco.chave}:${linha}:${coluna}`)}
                              aoMudar={(v) => {
                                if (!ensaio) return;
                                setValores((atual) => ({ ...atual, [ensaio.id]: v }));
                              }}
                              aoNavegar={(delta) => navegar(bloco.chave, linha, coluna, delta)}
                            />
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Secao>
          ))}

          {podeLancar && (
            <div className="sticky bottom-4 z-20 flex flex-wrap items-center gap-3 rounded-[var(--radius-lg)] border border-[hsl(var(--line-strong))] bg-[hsl(var(--card))] px-5 py-3.5 shadow-lg">
              <TableProperties className="h-4 w-4 shrink-0 text-primary" />
              <p className="num flex-1 text-sm text-foreground">
                {pendencias.length === 0
                  ? 'Nenhuma alteração'
                  : `${pendencias.length} ${pendencias.length === 1 ? 'resultado pronto' : 'resultados prontos'} para gravar`}
              </p>
              {pendencias.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setValores({})} className="text-xs">
                  descartar
                </Button>
              )}
              <Button onClick={gravar} disabled={pendencias.length === 0} className="gap-2">
                <Save className="h-4 w-4" /> Gravar
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

/* ---------------- célula da grade ---------------- */

function Celula({
  ensaio, parametro, valor, somenteLeitura, refCelula, aoMudar, aoNavegar,
}: {
  ensaio: Ensaio | undefined;
  parametro: Parametro;
  valor: string | undefined;
  somenteLeitura: boolean;
  refCelula: (el: HTMLInputElement | null) => void;
  aoMudar: (v: string) => void;
  aoNavegar: (delta: number) => void;
}) {
  if (!ensaio) {
    return <td className="px-2 py-1.5 text-center text-xs text-muted-foreground/40">—</td>;
  }

  const texto = valor ?? (ensaio.valor !== undefined ? numero(ensaio.valor, parametro.casasDecimais) : '');
  const numerico = Number(texto.replace(',', '.'));
  const temValor = texto.trim() !== '' && Number.isFinite(numerico);
  const sujo = valor !== undefined && valor !== (ensaio.valor !== undefined ? numero(ensaio.valor, parametro.casasDecimais) : '');

  const foraDeFaixa = temValor && parametro.limiteInferior !== undefined &&
    (numerico < parametro.limiteInferior || numerico > (parametro.limiteSuperior ?? Infinity));

  const cor = parametro.ehPh && temValor ? corDoPh(numerico) : undefined;
  const faixa = parametro.ehPh && temValor
    ? classificarPh(numerico, parametro.extrator ?? 'H2O')
    : undefined;

  return (
    <td className="px-1 py-1">
      <input
        ref={refCelula}
        value={texto}
        readOnly={somenteLeitura}
        inputMode="decimal"
        aria-label={`${parametro.nome}${parametro.unidade ? ` em ${parametro.unidade}` : ''}`}
        title={faixa ? `${faixa.rotulo} — ${faixa.descricao}` : parametro.nome}
        onChange={(e) => aoMudar(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === 'ArrowDown') { e.preventDefault(); aoNavegar(1); }
          if (e.key === 'ArrowUp') { e.preventDefault(); aoNavegar(-1); }
        }}
        className={cn(
          'num h-8 w-[5.5rem] rounded-[var(--radius-sm)] border bg-[hsl(var(--surface-sunken))] px-2 text-center text-sm',
          'transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40',
          somenteLeitura && 'cursor-default opacity-60',
          foraDeFaixa ? 'border-destructive text-destructive'
            : sujo ? 'border-primary/60'
            : 'border-[hsl(var(--line-soft))]',
        )}
        style={cor && !foraDeFaixa ? { color: cor, borderColor: `${cor}66` } : undefined}
      />
    </td>
  );
}

/**
 * O rótulo precisa apontar para o controle: sem isso o leitor de tela
 * anuncia o campo sem nome, e o teste automatizado também não o encontra.
 */
function Campo({
  id, rotulo, dica, children,
}: { id: string; rotulo: string; dica?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label htmlFor={id} className="label-micro mb-2 block">{rotulo}</Label>
      {children}
      {dica && <p className="mt-1 text-[0.64rem] text-muted-foreground">{dica}</p>}
    </div>
  );
}

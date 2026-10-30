/* ============================================================
   BANCADA — curvas de calibração analítica
   O instrumento devolve um sinal; a curva traduz em concentração.
   ============================================================ */

import { useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid, Line, ReferenceLine, ResponsiveContainer, Scatter,
  ComposedChart, Tooltip, XAxis, YAxis,
} from 'recharts';
import { CheckCircle2, Plus, Save, Sigma, Trash2, TriangleAlert, Undo2 } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

import { useAcoes, useBancada, useIndices } from '../../data/store';
import {
  CRITERIOS_CURVA, ajustarCurva, concentracaoDaLeitura, leituraDaConcentracao,
  rotuloSituacao, situacaoDoResultado,
} from '../../lib/curva';
import { data as fData, diasAte, numero, tempoRelativo } from '../../lib/format';
import { Indicador, Pilula, Secao, Vazio } from '../../components/primitivos';
import { Formulario, novoId } from '../../components/editor';
import type { Curva, PontoCurva } from '../../types';

export default function Curvas() {
  const { estado, pode } = useBancada();
  const { salvarCurva } = useAcoes();
  const { parametroPorId, equipamentoPorId } = useIndices();

  const [selecionadaId, setSelecionadaId] = useState(estado.curvas[0]?.id ?? '');
  const [rascunho, setRascunho] = useState<PontoCurva[] | null>(null);
  const [leituraTeste, setLeituraTeste] = useState('');
  const [nova, setNova] = useState<Curva | null>(null);

  const curva = estado.curvas.find((c) => c.id === selecionadaId);
  const pontos = rascunho ?? curva?.pontos ?? [];
  const podeEditar = pode('configuracoes:editar');

  /** Recalcula a cada tecla: o analista vê o R² reagir ao descarte do ponto. */
  const ajuste = useMemo(
    () => ajustarCurva(pontos, curva?.tipoAjuste ?? 'linear'),
    [pontos, curva?.tipoAjuste],
  );

  const parametro = curva ? parametroPorId.get(curva.parametroId) : undefined;
  const maiorPadrao = useMemo(
    () => Math.max(0, ...pontos.filter((p) => !p.descartado).map((p) => p.concentracao)),
    [pontos],
  );

  const dadosGrafico = useMemo(() => {
    if (pontos.length === 0) return [];
    const limite = Math.max(...pontos.map((p) => p.concentracao), 1);
    const reta = [0, limite].map((c) => ({
      concentracao: c,
      ajustada: Number(leituraDaConcentracao(c, ajuste).toFixed(4)),
    }));
    const medidos = pontos.filter((p) => !p.descartado).map((p) => ({
      concentracao: p.concentracao,
      medida: Number(p.leitura.toFixed(4)),
    }));
    const fora = pontos.filter((p) => p.descartado).map((p) => ({
      concentracao: p.concentracao,
      descartada: Number(p.leitura.toFixed(4)),
    }));
    return [...reta, ...medidos, ...fora].sort((a, b) => a.concentracao - b.concentracao);
  }, [pontos, ajuste]);

  const teste = useMemo(() => {
    const v = Number(leituraTeste.replace(',', '.'));
    if (!Number.isFinite(v) || leituraTeste.trim() === '') return null;
    const c = concentracaoDaLeitura(v, ajuste, curva?.diluicao ?? 1);
    const sit = situacaoDoResultado(c / (curva?.diluicao ?? 1), ajuste, maiorPadrao);
    return { concentracao: c, situacao: sit };
  }, [leituraTeste, ajuste, curva?.diluicao, maiorPadrao]);

  const alterarPonto = (i: number, campo: 'concentracao' | 'leitura', texto: string) => {
    const v = Number(texto.replace(',', '.'));
    setRascunho((atual) => (atual ?? pontos).map((p, k) =>
      k === i ? { ...p, [campo]: Number.isFinite(v) ? v : 0 } : p));
  };

  const alternarDescarte = (i: number) => {
    setRascunho((atual) => (atual ?? pontos).map((p, k) =>
      k === i ? { ...p, descartado: !p.descartado } : p));
  };

  const adicionarPonto = () => {
    setRascunho((atual) => [...(atual ?? pontos), { concentracao: 0, leitura: 0 }]);
  };

  const removerPonto = (i: number) => {
    setRascunho((atual) => (atual ?? pontos).filter((_, k) => k !== i));
  };

  const gravar = () => {
    if (!curva || !rascunho) return;
    const validade = new Date();
    validade.setDate(validade.getDate() + CRITERIOS_CURVA.validadeDias);
    salvarCurva({
      ...curva,
      pontos: rascunho,
      coefAngular: ajuste.coefAngular,
      coefLinear: ajuste.coefLinear,
      r2: ajuste.r2,
      lod: ajuste.lod,
      loq: ajuste.loq,
      data: new Date().toISOString(),
      validaAte: validade.toISOString(),
      ativa: ajuste.aprovada,
      observacao: ajuste.avisos[0],
    });
    setRascunho(null);
    if (ajuste.aprovada) {
      toast.success('Curva gravada', {
        description: `R² ${ajuste.r2.toFixed(5)} · válida por ${CRITERIOS_CURVA.validadeDias} dias.`,
      });
    } else {
      toast.error('Curva gravada como inativa', {
        description: ajuste.avisos[0] ?? 'Fora dos critérios de aceitação.',
      });
    }
  };

  if (estado.curvas.length === 0) {
    return <Secao><Vazio icone={Sigma} titulo="Nenhuma curva cadastrada" /></Secao>;
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[17rem_minmax(0,1fr)]">
      {/* ---- lista ---- */}
      <Secao
        titulo="Curvas"
        descricao={`${estado.curvas.length} cadastradas`}
        semPadding
        acoes={podeEditar ? (
          <Button
            size="sm" className="h-8 gap-1.5 text-xs"
            onClick={() => setNova(curvaEmBranco(estado.parametros.find((p) => !p.ehPh)?.id ?? ''))}
          >
            <Plus className="h-3.5 w-3.5" /> Nova
          </Button>
        ) : undefined}
      >
        <ul className="divide-y divide-[hsl(var(--line-soft))]">
          {estado.curvas.map((c) => {
            const ativo = c.id === selecionadaId;
            const dias = diasAte(c.validaAte);
            const p = parametroPorId.get(c.parametroId);
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => { setSelecionadaId(c.id); setRascunho(null); setLeituraTeste(''); }}
                  className={cn(
                    'relative w-full px-4 py-3.5 text-left transition-colors',
                    ativo ? 'bg-[hsl(var(--surface-raised))]' : 'hover:bg-[hsl(var(--surface-raised)/0.6)]',
                  )}
                >
                  {ativo && <span className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-primary" aria-hidden />}
                  <div className="flex items-center gap-2">
                    <span className="num text-xs font-medium text-foreground">{c.codigo}</span>
                    <Pilula
                      tom={dias < 0 ? 'erro' : !c.ativa ? 'alerta' : 'sucesso'}
                      className="ml-auto px-1.5 py-0 text-[0.58rem]"
                    >
                      {dias < 0 ? 'vencida' : !c.ativa ? 'inativa' : 'ativa'}
                    </Pilula>
                  </div>
                  <p className="mt-0.5 truncate text-[0.68rem] text-muted-foreground">{p?.nome}</p>
                  <p className="num mt-1 text-[0.62rem] text-muted-foreground/70">
                    R² {c.r2.toFixed(4)} · {tempoRelativo(c.data)}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      </Secao>

      {/* ---- detalhe ---- */}
      {curva && (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Indicador
              rotulo="Coeficiente angular"
              valor={numero(ajuste.coefAngular, 5)}
              detalhe="sinal por unidade de concentração"
            />
            <Indicador
              rotulo="Linearidade"
              valor={`R² ${ajuste.r2.toFixed(5)}`}
              detalhe={`mínimo ${CRITERIOS_CURVA.r2Min}`}
              destaque={ajuste.r2 < CRITERIOS_CURVA.r2Min}
            />
            <Indicador
              rotulo="Limite de detecção"
              valor={numero(ajuste.lod, parametro?.casasDecimais ?? 2)}
              sufixo={parametro?.unidade}
              detalhe="3,3 · s / a"
            />
            <Indicador
              rotulo="Limite de quantificação"
              valor={numero(ajuste.loq, parametro?.casasDecimais ?? 2)}
              sufixo={parametro?.unidade}
              detalhe="10 · s / a"
            />
          </div>

          <Secao
            titulo={curva.nome}
            descricao={`${parametro?.nome} · ${curva.tipoAjuste === 'linear-sem-intercepto' ? 'ajuste forçado pela origem' : 'ajuste linear'} · diluição 1:${curva.diluicao}${curva.equipamentoId ? ` · ${equipamentoPorId.get(curva.equipamentoId)?.tag}` : ''}`}
            acoes={
              <Pilula tom={ajuste.aprovada ? 'sucesso' : 'erro'} pontinho>
                {ajuste.aprovada ? 'dentro dos critérios' : 'fora dos critérios'}
              </Pilula>
            }
          >
            <div className="h-[17rem] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={dadosGrafico} margin={{ top: 10, right: 16, bottom: 4, left: -8 }}>
                  <CartesianGrid stroke="hsl(var(--line-soft))" strokeDasharray="2 4" />
                  <XAxis
                    type="number" dataKey="concentracao" domain={[0, 'dataMax']}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontFamily: 'var(--font-mono)' }}
                    tickLine={false} axisLine={{ stroke: 'hsl(var(--line-soft))' }}
                    label={{ value: `concentração${parametro?.unidade ? ` (${parametro.unidade})` : ''}`,
                             position: 'insideBottom', offset: -2, fontSize: 10,
                             fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontFamily: 'var(--font-mono)' }}
                    tickLine={false} axisLine={false} width={58}
                    label={{ value: 'sinal', angle: -90, position: 'insideLeft', offset: 16,
                             fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <ReferenceLine y={0} stroke="hsl(var(--line-strong))" strokeDasharray="3 3" />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))',
                      borderRadius: 'var(--radius-sm)', fontSize: 12, fontFamily: 'var(--font-mono)',
                    }}
                    labelFormatter={(v) => `concentração ${numero(Number(v), 2)}`}
                  />
                  <Line
                    type="linear" dataKey="ajustada" name="reta ajustada"
                    stroke="hsl(var(--primary))" strokeWidth={1.5} strokeDasharray="5 4"
                    dot={false} connectNulls isAnimationActive={false}
                  />
                  <Scatter dataKey="medida" name="padrão" fill="hsl(var(--primary))" />
                  <Scatter dataKey="descartada" name="descartado" fill="hsl(var(--destructive))" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {ajuste.avisos.length > 0 && (
              <div className="mt-4 space-y-2">
                {ajuste.avisos.map((a) => (
                  <p key={a} className="flex items-start gap-2 text-xs leading-relaxed text-[hsl(var(--warning))]">
                    <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {a}
                  </p>
                ))}
              </div>
            )}
          </Secao>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <Secao
              titulo="Padrões"
              descricao="Descartar um ponto o mantém no registro e o tira do ajuste."
              acoes={podeEditar && (
                <>
                  <Button variant="outline" size="sm" onClick={adicionarPonto} className="h-7 gap-1.5 text-xs">
                    <Plus className="h-3.5 w-3.5" /> ponto
                  </Button>
                  {rascunho && (
                    <Button variant="ghost" size="sm" onClick={() => setRascunho(null)} className="h-7 gap-1.5 text-xs">
                      <Undo2 className="h-3.5 w-3.5" /> desfazer
                    </Button>
                  )}
                </>
              )}
              semPadding
            >
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[hsl(var(--line-soft))]">
                      <th className="label-micro px-4 py-2.5 text-left font-medium">
                        Concentração{parametro?.unidade ? ` (${parametro.unidade})` : ''}
                      </th>
                      <th className="label-micro px-4 py-2.5 text-left font-medium">Sinal lido</th>
                      <th className="label-micro px-4 py-2.5 text-right font-medium">Resíduo</th>
                      <th className="label-micro px-4 py-2.5 text-right font-medium"> </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pontos.map((p, i) => {
                      const previsto = leituraDaConcentracao(p.concentracao, ajuste);
                      const residuo = p.leitura - previsto;
                      return (
                        <tr
                          key={i}
                          className={cn(
                            'border-b border-[hsl(var(--line-soft))] last:border-0',
                            p.descartado && 'opacity-45',
                          )}
                        >
                          <td className="px-4 py-1.5">
                            <Input
                              value={String(p.concentracao).replace('.', ',')}
                              onChange={(e) => alterarPonto(i, 'concentracao', e.target.value)}
                              readOnly={!podeEditar}
                              inputMode="decimal"
                              aria-label={`Concentração do padrão ${i + 1}`}
                              className="num h-8 w-28 text-sm"
                            />
                          </td>
                          <td className="px-4 py-1.5">
                            <Input
                              value={String(p.leitura).replace('.', ',')}
                              onChange={(e) => alterarPonto(i, 'leitura', e.target.value)}
                              readOnly={!podeEditar}
                              inputMode="decimal"
                              aria-label={`Sinal lido do padrão ${i + 1}`}
                              className="num h-8 w-28 text-sm"
                            />
                          </td>
                          <td className={cn('num px-4 py-1.5 text-right text-xs',
                            Math.abs(residuo) > ajuste.desvioResidual * 2 && !p.descartado
                              ? 'text-[hsl(var(--warning))]' : 'text-muted-foreground')}>
                            {p.descartado ? '—' : numero(residuo, 4)}
                          </td>
                          <td className="px-4 py-1.5 text-right">
                            {podeEditar && (
                              <span className="flex justify-end gap-1">
                                <Button
                                  size="sm" variant="ghost" className="h-6 px-2 text-[0.66rem]"
                                  onClick={() => alternarDescarte(i)}
                                >
                                  {p.descartado ? 'usar' : 'descartar'}
                                </Button>
                                <Button
                                  size="sm" variant="ghost" className="h-6 w-6 p-0"
                                  aria-label={`Remover padrão ${i + 1}`}
                                  onClick={() => removerPonto(i)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {podeEditar && rascunho && (
                <div className="flex items-center gap-3 border-t border-[hsl(var(--line-soft))] px-4 py-3">
                  <p className="flex-1 text-xs text-muted-foreground">
                    Alterações não gravadas — o ajuste acima já reflete o rascunho.
                  </p>
                  <Button onClick={gravar} size="sm" className="gap-1.5 text-xs">
                    <Save className="h-3.5 w-3.5" /> Gravar curva
                  </Button>
                </div>
              )}
            </Secao>

            <div className="space-y-5">
              <Secao titulo="Aplicar leitura" descricao="Confere a curva contra um sinal conhecido.">
                <Label htmlFor="leitura-teste" className="label-micro mb-2 block">Sinal do instrumento</Label>
                <Input
                  id="leitura-teste"
                  value={leituraTeste}
                  onChange={(e) => setLeituraTeste(e.target.value)}
                  inputMode="decimal"
                  placeholder="0,629"
                  className="num h-10 text-lg"
                />
                {teste && (
                  <div className="panel-sunken mt-4 p-4">
                    <p className="label-micro mb-1">Concentração</p>
                    <p className="num text-2xl font-semibold text-foreground">
                      {numero(teste.concentracao, parametro?.casasDecimais ?? 2)}
                      <span className="ml-1.5 text-xs font-normal text-muted-foreground">{parametro?.unidade}</span>
                    </p>
                    <p className="mt-2 text-[0.68rem] leading-relaxed text-muted-foreground">
                      já multiplicado pela diluição 1:{curva.diluicao}
                    </p>
                    <div className="mt-3 border-t border-[hsl(var(--line-soft))] pt-3">
                      {teste.situacao === 'quantificavel' ? (
                        <p className="flex items-center gap-1.5 text-xs text-[hsl(var(--success))]">
                          <CheckCircle2 className="h-3.5 w-3.5" /> dentro da faixa de trabalho
                        </p>
                      ) : (
                        <p className="flex items-start gap-1.5 text-xs text-[hsl(var(--warning))]">
                          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          {rotuloSituacao(teste.situacao, ajuste, parametro?.casasDecimais ?? 2)}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </Secao>

              <Secao titulo="Ficha">
                <dl className="space-y-2.5 text-sm">
                  <Linha rotulo="Equação" valor={
                    <span className="num text-xs">
                      y = {numero(ajuste.coefAngular, 5)}·x {ajuste.coefLinear >= 0 ? '+' : '−'} {numero(Math.abs(ajuste.coefLinear), 5)}
                    </span>} />
                  <Linha rotulo="Pontos no ajuste" valor={<span className="num">{ajuste.pontosUsados}</span>} />
                  <Linha rotulo="Desvio residual" valor={<span className="num">{numero(ajuste.desvioResidual, 5)}</span>} />
                  <Linha rotulo="Faixa de trabalho" valor={<span className="num">0 – {numero(maiorPadrao, 1)}</span>} />
                  <Linha rotulo="Preparada em" valor={fData(curva.data)} />
                  <Linha rotulo="Válida até" valor={
                    <span className={diasAte(curva.validaAte) < 0 ? 'text-destructive' : undefined}>
                      {fData(curva.validaAte)}
                    </span>} />
                </dl>
              </Secao>
            </div>
          </div>
        </div>
      )}
      <NovaCurva
        curva={nova}
        aoFechar={() => setNova(null)}
        aoCriar={(c) => {
          salvarCurva(c);
          setSelecionadaId(c.id);
          setRascunho(null);
          setNova(null);
          toast.success('Curva criada', {
            description: `${c.codigo} · R² ${c.r2.toFixed(5)} · ${c.pontos.length} padrões.`,
          });
        }}
      />
    </div>
  );
}

/** Curva em branco com três padrões, que é o mínimo que o critério aceita. */
function curvaEmBranco(parametroId: string): Curva {
  const validade = new Date();
  validade.setDate(validade.getDate() + CRITERIOS_CURVA.validadeDias);
  return {
    id: novoId('cva'), codigo: '', nome: '', parametroId,
    tipoAjuste: 'linear',
    pontos: [
      { concentracao: 0, leitura: 0 },
      { concentracao: 0, leitura: 0 },
      { concentracao: 0, leitura: 0 },
    ],
    coefAngular: 0, coefLinear: 0, r2: 0, diluicao: 1,
    data: new Date().toISOString(), validaAte: validade.toISOString(),
    ativa: false,
  };
}

/**
 * Curva nasce com os padrões: curva sem leitura de padrão não é curva, e
 * o ajuste já sai calculado para o analista ver o R² antes de gravar.
 */
function NovaCurva({ curva, aoFechar, aoCriar }: {
  curva: Curva | null; aoFechar: () => void; aoCriar: (c: Curva) => void;
}) {
  const { estado } = useBancada();
  const [rascunho, setRascunho] = useState<Curva | null>(null);
  const atual = rascunho ?? curva;

  useEffect(() => { setRascunho(curva); }, [curva]);

  const ajuste = useMemo(
    () => (atual ? ajustarCurva(atual.pontos, atual.tipoAjuste) : undefined),
    [atual],
  );

  if (!atual || !ajuste) return null;

  const definirPonto = (i: number, campo: 'concentracao' | 'leitura', valor: number) => {
    setRascunho({
      ...atual,
      pontos: atual.pontos.map((p, k) => (k === i ? { ...p, [campo]: valor } : p)),
    });
  };

  const preenchidos = atual.pontos.filter((p) => p.concentracao > 0 || p.leitura > 0);
  const erro = !atual.codigo.trim() ? 'Dê um código à curva.'
    : !atual.nome.trim() ? 'Dê um nome à curva.'
    : preenchidos.length < CRITERIOS_CURVA.pontosMin
      ? `São necessários ao menos ${CRITERIOS_CURVA.pontosMin} padrões preenchidos.`
      : undefined;

  return (
    <Dialog open onOpenChange={(a) => { if (!a) aoFechar(); }}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nova curva analítica</DialogTitle>
          <DialogDescription>
            Os padrões entram aqui; o ajuste, o R² e os limites de detecção saem do que você digitar.
          </DialogDescription>
        </DialogHeader>

        <Formulario
          campos={[
            { tipo: 'texto', chave: 'codigo', rotulo: 'Código' },
            { tipo: 'texto', chave: 'nome', rotulo: 'Nome' },
            { tipo: 'selecao', chave: 'parametroId', rotulo: 'Elemento',
              opcoes: estado.parametros.filter((p) => !p.ehPh).map((p) => ({ valor: p.id, rotulo: `${p.codigo} — ${p.nome}` })) },
            { tipo: 'selecao', chave: 'equipamentoId', rotulo: 'Equipamento',
              opcoes: estado.equipamentos.map((e) => ({ valor: e.id, rotulo: `${e.tag} — ${e.nome}` })) },
            { tipo: 'selecao', chave: 'tipoAjuste', rotulo: 'Ajuste',
              opcoes: [
                { valor: 'linear', rotulo: 'Linear com intercepto' },
                { valor: 'linear-sem-intercepto', rotulo: 'Linear pela origem' },
              ] },
            { tipo: 'numero', chave: 'diluicao', rotulo: 'Diluição', passo: 0.1, min: 0.01, sufixo: '×' },
          ]}
          valor={atual}
          aoMudar={setRascunho}
          extra={
            <div className="sm:col-span-2">
              <div className="mb-2 flex items-baseline justify-between">
                <Label className="text-xs text-muted-foreground">Padrões</Label>
                <button
                  type="button"
                  className="text-[0.68rem] text-primary hover:underline"
                  onClick={() => setRascunho({ ...atual, pontos: [...atual.pontos, { concentracao: 0, leitura: 0 }] })}
                >
                  adicionar padrão
                </button>
              </div>

              <div className="space-y-1.5">
                {atual.pontos.map((ponto, i) => (
                  <div key={i} className="grid grid-cols-2 gap-2">
                    <Input
                      type="number" step="any" className="num h-8 text-xs"
                      aria-label={`Concentração do padrão ${i + 1}`}
                      placeholder="concentração"
                      value={ponto.concentracao || ''}
                      onChange={(e) => definirPonto(i, 'concentracao', Number(e.target.value))}
                    />
                    <Input
                      type="number" step="any" className="num h-8 text-xs"
                      aria-label={`Leitura do padrão ${i + 1}`}
                      placeholder="leitura"
                      value={ponto.leitura || ''}
                      onChange={(e) => definirPonto(i, 'leitura', Number(e.target.value))}
                    />
                  </div>
                ))}
              </div>

              <p className="num mt-2 text-[0.68rem] text-muted-foreground">
                R² {ajuste.r2 ? ajuste.r2.toFixed(5) : '—'} · coeficiente angular{' '}
                {ajuste.coefAngular ? ajuste.coefAngular.toFixed(5) : '—'}
                {ajuste.avisos[0] ? ` · ${ajuste.avisos[0]}` : ''}
              </p>
            </div>
          }
        />

        {erro && (
          <p role="alert" className="rounded-[var(--radius-sm)] bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {erro}
          </p>
        )}

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={aoFechar}>Cancelar</Button>
          <Button
            disabled={Boolean(erro)}
            onClick={() => aoCriar({
              ...atual,
              pontos: preenchidos,
              coefAngular: ajuste.coefAngular,
              coefLinear: ajuste.coefLinear,
              r2: ajuste.r2,
              lod: ajuste.lod,
              loq: ajuste.loq,
              ativa: ajuste.aprovada,
              observacao: ajuste.avisos[0],
            })}
          >
            Criar curva
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="label-micro shrink-0 pt-0.5">{rotulo}</dt>
      <dd className="min-w-0 text-right text-sm text-foreground">{valor}</dd>
    </div>
  );
}

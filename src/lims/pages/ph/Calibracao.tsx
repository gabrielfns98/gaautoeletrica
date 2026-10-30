/* ============================================================
   BANCADA — calibração do eletrodo
   Ajuste multiponto com tampões rastreáveis, verificação dos
   critérios de aceitação e histórico de desgaste do bulbo.
   ============================================================ */

import { useMemo, useState } from 'react';
import {
  CartesianGrid, Line, LineChart, ReferenceArea, ReferenceLine,
  ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis,
} from 'recharts';
import { CheckCircle2, Info, Save, TriangleAlert, Wand2 } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { useAcoes, useBancada, useCriterio } from '../../data/store';
import {
  CRITERIOS, TAMPOES_DISPONIVEIS, calcularCalibracao, slopeTeorico, valorTampao,
} from '../../lib/ph';
import { data as fData, dataHora, numero, tempoRelativo } from '../../lib/format';
import { Pilula, Secao, Tabela } from '../../components/primitivos';
import type { Calibracao as TCalibracao, PontoCalibracao } from '../../types';

interface Ponto {
  tampao: number;
  usar: boolean;
  mV: string;
  temperatura: string;
}

/** Perfis de eletrodo usados pelo botão de leitura assistida. */
const PERFIL: Record<string, { slope: number; offset: number }> = {
  'eq-phm-01': { slope: 99.1, offset: -2.4 },
  'eq-phm-02': { slope: 96.4, offset: 11.8 },
  'eq-phm-03': { slope: 99.6, offset: -1.1 },
  'eq-phm-04': { slope: 94.2, offset: 26.5 },
};

export default function Calibracao() {
  const { estado, pode } = useBancada();
  /* Slope, offset e linearidade são critérios de eletrodo. */
  const criterio = useCriterio({ ehPh: true });
  const { salvarCalibracao } = useAcoes();

  const phmetros = useMemo(
    () => estado.equipamentos.filter((e) => e.tipo === 'phmetro' && e.ativo),
    [estado.equipamentos],
  );
  const [equipamentoId, setEquipamentoId] = useState(phmetros[0]?.id ?? '');
  const [observacao, setObservacao] = useState('');

  const [pontos, setPontos] = useState<Ponto[]>(
    TAMPOES_DISPONIVEIS.map((t) => ({ tampao: t, usar: true, mV: '', temperatura: '25.0' })),
  );

  const equipamento = phmetros.find((e) => e.id === equipamentoId);

  const historico = useMemo(
    () => estado.calibracoes
      .filter((c) => c.equipamentoId === equipamentoId)
      .sort((a, b) => +new Date(b.data) - +new Date(a.data)),
    [estado.calibracoes, equipamentoId],
  );

  const pontosValidos: PontoCalibracao[] = useMemo(
    () => pontos
      .filter((p) => p.usar && p.mV.trim() !== '')
      .map((p) => ({
        tampao: p.tampao,
        mV: Number(p.mV.replace(',', '.')),
        temperatura: Number(p.temperatura.replace(',', '.')) || 25,
      }))
      .filter((p) => Number.isFinite(p.mV)),
    [pontos],
  );

  const resultado = useMemo(
    () => (pontosValidos.length >= 2 ? calcularCalibracao(pontosValidos) : null),
    [pontosValidos],
  );

  const atualizar = (tampao: number, campo: keyof Ponto, valor: string | boolean) => {
    setPontos((lista) => lista.map((p) => (p.tampao === tampao ? { ...p, [campo]: valor } : p)));
  };

  /** Preenche os mV como o instrumento preencheria, segundo o desgaste do eletrodo. */
  const lerDoInstrumento = () => {
    const perfil = PERFIL[equipamentoId] ?? { slope: 98, offset: 0 };
    const temperatura = 24.2 + Math.random() * 1.6;
    const slopeMv = (perfil.slope / 100) * slopeTeorico(temperatura);
    setPontos((lista) => lista.map((p) => {
      if (!p.usar) return p;
      const phReal = valorTampao(p.tampao, temperatura);
      const mV = perfil.offset - slopeMv * (phReal - 7) + (Math.random() - 0.5) * 0.6;
      return { ...p, mV: mV.toFixed(1), temperatura: (temperatura + (Math.random() - 0.5) * 0.3).toFixed(1) };
    }));
    toast.info('Leituras importadas do instrumento', {
      description: `${equipamento?.tag}: potenciais capturados nos tampões selecionados.`,
    });
  };

  const gravar = () => {
    if (!resultado || !equipamento) return;
    const c = salvarCalibracao(equipamento.id, pontosValidos, observacao || undefined);
    setObservacao('');
    if (c.status === 'valida') {
      toast.success('Calibração aprovada', {
        description: `${equipamento.tag}: slope ${numero(c.slopePercentual, 1)}%, offset ${numero(c.offsetMv, 1)} mV. Válida por 12 h.`,
      });
    } else {
      toast.error('Calibração reprovada', {
        description: resultado.avisos[0] ?? 'Fora dos critérios de aceitação.',
      });
    }
  };

  const dadosRegressao = useMemo(() => {
    if (!resultado || pontosValidos.length < 2) return [];
    return pontosValidos.map((p) => ({
      ph: Number(valorTampao(p.tampao, p.temperatura).toFixed(3)),
      mV: Number(p.mV.toFixed(2)),
      ajustado: Number((resultado.offsetMv - resultado.slopeMvPorPh * (valorTampao(p.tampao, p.temperatura) - 7)).toFixed(2)),
    })).sort((a, b) => a.ph - b.ph);
  }, [resultado, pontosValidos]);

  const serieHistorico = useMemo(
    () => [...historico].reverse().map((c) => ({
      data: fData(c.data),
      slope: Number(c.slopePercentual.toFixed(2)),
      offset: Number(c.offsetMv.toFixed(2)),
    })),
    [historico],
  );

  if (!pode('ph:criar')) {
    return <Secao><p className="py-8 text-center text-sm text-muted-foreground">Sem permissão para calibrar equipamentos.</p></Secao>;
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-5">
        <Secao
          titulo="Ajuste multiponto"
          descricao="Tampões rastreáveis NIST/DIN 19266, corrigidos pela temperatura de uso."
          acoes={
            <Button variant="outline" size="sm" onClick={lerDoInstrumento} className="h-8 gap-1.5 text-xs">
              <Wand2 className="h-3.5 w-3.5" /> Ler do instrumento
            </Button>
          }
        >
          <div className="mb-5">
            <Label className="label-micro mb-2 block">Equipamento</Label>
            <Select value={equipamentoId} onValueChange={setEquipamentoId}>
              <SelectTrigger className="h-9 sm:w-96"><SelectValue /></SelectTrigger>
              <SelectContent>
                {phmetros.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    <span className="num mr-2 text-xs text-muted-foreground">{e.tag}</span>
                    {e.fabricante} {e.modelo} — eletrodo {e.eletrodo?.modelo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {equipamento?.eletrodo && (
              <p className="mt-2 text-xs text-muted-foreground">
                Eletrodo {equipamento.eletrodo.numeroSerie} instalado {tempoRelativo(equipamento.eletrodo.dataInstalacao)} ·
                vida útil estimada de {equipamento.eletrodo.vidaUtilMeses} meses.
              </p>
            )}
          </div>

          <div className="space-y-2.5">
            {pontos.map((p) => {
              const temperatura = Number(p.temperatura.replace(',', '.')) || 25;
              const phReal = valorTampao(p.tampao, temperatura);
              return (
                <div
                  key={p.tampao}
                  className={cn(
                    'panel-sunken grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-3 p-4 transition-opacity sm:grid-cols-[auto_8rem_1fr_1fr]',
                    !p.usar && 'opacity-45',
                  )}
                >
                  <Checkbox
                    checked={p.usar}
                    onCheckedChange={(v) => atualizar(p.tampao, 'usar', Boolean(v))}
                    aria-label={`Usar tampão ${p.tampao}`}
                  />
                  <div>
                    <p className="num text-sm font-medium text-foreground">pH {p.tampao.toFixed(2)}</p>
                    <p className="num text-[0.68rem] text-muted-foreground">
                      {phReal.toFixed(2)} a {temperatura.toFixed(1)} °C
                    </p>
                  </div>
                  <div>
                    <Label className="label-micro mb-1.5 block">Potencial lido (mV)</Label>
                    <Input
                      inputMode="decimal" disabled={!p.usar} value={p.mV}
                      onChange={(e) => atualizar(p.tampao, 'mV', e.target.value)}
                      placeholder="0,0" className="num h-9"
                    />
                  </div>
                  <div>
                    <Label className="label-micro mb-1.5 block">Temperatura (°C)</Label>
                    <Input
                      inputMode="decimal" disabled={!p.usar} value={p.temperatura}
                      onChange={(e) => atualizar(p.tampao, 'temperatura', e.target.value)}
                      className="num h-9"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5">
            <Label className="label-micro mb-2 block" htmlFor="obs-cal">Observação</Label>
            <Input
              id="obs-cal" value={observacao} onChange={(e) => setObservacao(e.target.value)}
              placeholder="Bulbo limpo com solução de pepsina antes do ajuste…" className="h-9"
            />
          </div>
        </Secao>

        {resultado && (
          <Secao titulo="Reta de calibração" descricao="Potencial medido em função do pH do tampão.">
            <div className="h-[15rem] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 12, bottom: 4, left: -14 }}>
                  <CartesianGrid stroke="hsl(var(--line-soft))" strokeDasharray="2 4" />
                  <XAxis
                    type="number" dataKey="ph" domain={[3, 11]} name="pH"
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontFamily: 'var(--font-mono)' }}
                    tickLine={false} axisLine={{ stroke: 'hsl(var(--line-soft))' }}
                  />
                  <YAxis
                    type="number" dataKey="mV" name="mV"
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontFamily: 'var(--font-mono)' }}
                    tickLine={false} axisLine={false} width={52}
                  />
                  <ZAxis range={[90, 90]} />
                  <ReferenceLine y={0} stroke="hsl(var(--line-strong))" strokeDasharray="3 3" />
                  <ReferenceLine x={7} stroke="hsl(var(--line-strong))" strokeDasharray="3 3" />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    contentStyle={{
                      background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))',
                      borderRadius: 'var(--radius-sm)', fontSize: 12, fontFamily: 'var(--font-mono)',
                    }}
                    formatter={(v: number, n: string) => [n === 'mV' ? `${v} mV` : v, n]}
                  />
                  <Scatter data={dadosRegressao} dataKey="mV" fill="hsl(var(--primary))" />
                  <Scatter
                    data={dadosRegressao} dataKey="ajustado" fill="none"
                    line={{ stroke: 'hsl(var(--primary))', strokeWidth: 1.5, strokeDasharray: '5 4' }}
                    shape={() => <g />}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </Secao>
        )}

        {historico.length > 1 && (
          <Secao titulo="Desgaste do eletrodo" descricao="Evolução do slope nas últimas calibrações.">
            <div className="h-[13rem] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={serieHistorico} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
                  <CartesianGrid stroke="hsl(var(--line-soft))" strokeDasharray="2 4" vertical={false} />
                  <ReferenceArea
                    y1={criterio.slopeMin} y2={criterio.slopeMax}
                    fill="hsl(var(--success))" fillOpacity={0.07}
                  />
                  <ReferenceLine y={criterio.slopeMin} stroke="hsl(var(--destructive))" strokeDasharray="4 4" />
                  <XAxis
                    dataKey="data"
                    tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))', fontFamily: 'var(--font-mono)' }}
                    tickLine={false} axisLine={{ stroke: 'hsl(var(--line-soft))' }} interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={[90, 106]} unit="%"
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontFamily: 'var(--font-mono)' }}
                    tickLine={false} axisLine={false} width={46}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))',
                      borderRadius: 'var(--radius-sm)', fontSize: 12, fontFamily: 'var(--font-mono)',
                    }}
                    formatter={(v: number) => [`${v}%`, 'slope']}
                  />
                  <Line
                    type="monotone" dataKey="slope" stroke="hsl(var(--primary))" strokeWidth={2}
                    dot={{ r: 2.5, fill: 'hsl(var(--primary))' }} isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Secao>
        )}
      </div>

      {/* ---- Avaliação ---- */}
      <div className="space-y-5">
        <Secao titulo="Avaliação">
          {!resultado ? (
            <p className="py-6 text-center text-xs text-muted-foreground">
              Informe o potencial de ao menos dois tampões para calcular a reta.
            </p>
          ) : (
            <div className="space-y-4">
              <Criterio
                rotulo="Slope"
                valor={`${numero(resultado.slopePercentual, 2)}%`}
                detalhe={`${numero(resultado.slopeMvPorPh, 2)} mV/pH · teórico ${numero(slopeTeorico(resultado.temperaturaMedia), 2)}`}
                ok={resultado.slopePercentual >= criterio.slopeMin && resultado.slopePercentual <= criterio.slopeMax}
                faixa={`${criterio.slopeMin}–${criterio.slopeMax}%`}
              />
              <Criterio
                rotulo="Offset (pH 7)"
                valor={`${numero(resultado.offsetMv, 2)} mV`}
                detalhe="Potencial de assimetria no ponto isopotencial"
                ok={Math.abs(resultado.offsetMv) <= criterio.offsetMaxMv}
                faixa={`±${criterio.offsetMaxMv} mV`}
              />
              <Criterio
                rotulo="Linearidade"
                valor={`R² ${resultado.r2.toFixed(5)}`}
                detalhe={`${pontosValidos.length} pontos a ${numero(resultado.temperaturaMedia, 1)} °C`}
                ok={pontosValidos.length < 3 || resultado.r2 >= criterio.r2Min}
                faixa={`≥ ${criterio.r2Min}`}
              />

              <div
                className={cn(
                  'flex items-start gap-2.5 rounded-[var(--radius-sm)] border px-3.5 py-3',
                  resultado.aprovada
                    ? 'border-[hsl(var(--success)/0.3)] bg-[hsl(var(--success)/0.1)]'
                    : 'border-destructive/30 bg-destructive/10',
                )}
              >
                {resultado.aprovada
                  ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--success))]" />
                  : <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />}
                <div>
                  <p className={cn('text-xs font-medium', resultado.aprovada ? 'text-[hsl(var(--success))]' : 'text-destructive')}>
                    {resultado.aprovada ? 'Dentro dos critérios de aceitação' : 'Fora dos critérios'}
                  </p>
                  {resultado.avisos.map((a) => (
                    <p key={a} className="mt-1 text-[0.7rem] leading-relaxed text-muted-foreground">{a}</p>
                  ))}
                </div>
              </div>

              <Button onClick={gravar} className="w-full gap-2">
                <Save className="h-4 w-4" /> Registrar calibração
              </Button>

              <p className="flex items-start gap-1.5 text-[0.68rem] leading-relaxed text-muted-foreground">
                <Info className="mt-0.5 h-3 w-3 shrink-0" />
                A calibração vale 12 h. Depois disso a bancada bloqueia novas leituras até novo ajuste.
              </p>
            </div>
          )}
        </Secao>

        <Secao titulo="Histórico" descricao={`${historico.length} calibrações`} semPadding>
          <Tabela
            denso
            colunas={[
              {
                chave: 'data', titulo: 'Data',
                render: (c) => <span className="num text-xs">{dataHora(c.data)}</span>,
              },
              {
                chave: 'slope', titulo: 'Slope', alinhamento: 'direita',
                render: (c) => (
                  <span className={cn('num text-xs', c.slopePercentual < criterio.slopeMin && 'text-destructive')}>
                    {numero(c.slopePercentual, 1)}%
                  </span>
                ),
              },
              {
                chave: 'status', titulo: '', alinhamento: 'direita',
                render: (c) => (
                  <Pilula
                    tom={c.status === 'valida' ? 'sucesso' : c.status === 'reprovada' ? 'erro' : 'neutro'}
                    className="px-1.5 py-0 text-[0.62rem]"
                  >
                    {c.status}
                  </Pilula>
                ),
              },
            ]}
            dados={historico.slice(0, 12)}
            chaveDe={(c) => c.id}
          />
        </Secao>

        <Secao titulo="Procedimento" descricao="POP-ACI-004">
          <ol className="space-y-2.5 text-xs leading-relaxed text-muted-foreground">
            {[
              'Lave o bulbo com água deionizada e seque por toque, sem esfregar.',
              'Mergulhe no tampão 7,00 e aguarde a leitura estabilizar.',
              'Repita para os tampões 4,01 e 10,01, lavando entre cada um.',
              'Confira slope e offset contra os critérios ao lado.',
              'Reprovou? Limpe o bulbo com pepsina/HCl e repita. Persistindo, troque o eletrodo.',
            ].map((passo, i) => (
              <li key={passo} className="flex gap-2.5">
                <span className="num flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[0.6rem] font-semibold text-primary">
                  {i + 1}
                </span>
                {passo}
              </li>
            ))}
          </ol>
        </Secao>
      </div>
    </div>
  );
}

function Criterio({
  rotulo, valor, detalhe, ok, faixa,
}: { rotulo: string; valor: string; detalhe: string; ok: boolean; faixa: string }) {
  return (
    <div className="panel-sunken p-3.5">
      <div className="flex items-center justify-between gap-2">
        <p className="label-micro">{rotulo}</p>
        <Pilula tom={ok ? 'sucesso' : 'erro'} className="px-1.5 py-0 text-[0.62rem]">
          {ok ? 'conforme' : 'não conforme'}
        </Pilula>
      </div>
      <p className={cn('num mt-1.5 text-lg font-semibold', ok ? 'text-foreground' : 'text-destructive')}>
        {valor}
      </p>
      <p className="mt-0.5 text-[0.68rem] leading-snug text-muted-foreground">{detalhe}</p>
      <p className="label-micro mt-1.5">critério {faixa}</p>
    </div>
  );
}

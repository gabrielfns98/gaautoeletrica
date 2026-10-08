/* ============================================================
   BANCADA — componentes visuais de pH
   A escala de pH é a linguagem cromática do sistema: a mesma
   rampa do indicador universal aparece em chip, régua e mostrador.
   ============================================================ */

import { useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { cn } from '@/lib/utils';
import { classificarPh, corDoPh, tomDoPh } from '../lib/ph';
import { numero } from '../lib/format';
import type { PontoTrace } from '../types';

/* ---------------- Chip de valor ---------------- */

export function ChipPh({
  valor, extrator = 'H2O', tamanho = 'md', mostrarRotulo,
}: {
  valor: number | undefined;
  extrator?: 'H2O' | 'CaCl2' | 'KCl' | 'SMP' | 'direto';
  tamanho?: 'sm' | 'md' | 'lg';
  mostrarRotulo?: boolean;
}) {
  if (valor === undefined || !Number.isFinite(valor)) {
    return <span className="num text-sm text-muted-foreground">—</span>;
  }
  const faixa = classificarPh(valor, extrator);
  const tom = tomDoPh(valor);
  const classes = {
    sm: 'px-1.5 py-0 text-[0.7rem]',
    md: 'px-2 py-0.5 text-xs',
    lg: 'px-2.5 py-1 text-sm',
  }[tamanho];

  return (
    <span
      className={cn('ph-chip', classes)}
      style={{ ['--ph-hue' as string]: `var(--ph-${tom})` }}
      title={`${faixa.rotulo} — ${faixa.descricao}`}
    >
      {numero(valor, 2)}
      {mostrarRotulo && <span className="font-sans font-normal opacity-80">{faixa.rotulo}</span>}
    </span>
  );
}

/* ---------------- Régua do espectro ---------------- */

export function ReguaPh({
  valor, extrator = 'H2O', compacta, faixaIdeal,
}: {
  valor: number;
  extrator?: 'H2O' | 'CaCl2' | 'KCl' | 'SMP' | 'direto';
  compacta?: boolean;
  /** região destacada como alvo agronômico, em unidades de pH */
  faixaIdeal?: [number, number];
}) {
  const pos = Math.min(100, Math.max(0, (valor / 14) * 100));
  const faixa = classificarPh(valor, extrator);

  return (
    <div className="w-full">
      <div className="relative">
        {faixaIdeal && (
          <div
            className="absolute -inset-y-1 rounded-sm border-x-2 border-dashed border-foreground/25"
            style={{
              left: `${(faixaIdeal[0] / 14) * 100}%`,
              width: `${((faixaIdeal[1] - faixaIdeal[0]) / 14) * 100}%`,
            }}
            aria-hidden
          />
        )}
        <div className={cn('ph-spectrum w-full rounded-full', compacta ? 'h-1.5' : 'h-2.5')} />
        {Number.isFinite(valor) && (
          <div
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 transition-[left] duration-500 ease-out"
            style={{ left: `${pos}%` }}
          >
            <div
              className={cn(
                'rounded-full border-2 border-background bg-foreground shadow-lg',
                compacta ? 'h-3 w-3' : 'h-4 w-4',
              )}
              style={{ background: corDoPh(valor) }}
            />
          </div>
        )}
      </div>
      {!compacta && (
        <>
          <div className="mt-1.5 flex justify-between">
            {[0, 2, 4, 6, 7, 8, 10, 12, 14].map((n) => (
              <span key={n} className="num text-[0.62rem] text-muted-foreground/60">{n}</span>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            <span className="font-medium" style={{ color: corDoPh(valor) }}>{faixa.rotulo}</span>
            {' · '}{faixa.descricao}
          </p>
        </>
      )}
    </div>
  );
}

/* ---------------- Mostrador do instrumento ---------------- */

export function MostradorPh({
  ph, mV, temperatura, estavel, lendo, derivaMvPorMin, tempoS,
}: {
  ph: number;
  mV: number;
  temperatura: number;
  estavel: boolean;
  lendo: boolean;
  derivaMvPorMin: number;
  tempoS: number;
}) {
  const temLeitura = Number.isFinite(ph);
  const cor = temLeitura ? corDoPh(ph) : 'hsl(var(--muted-foreground))';
  const texto = temLeitura ? numero(ph, 2) : '--,--';

  return (
    <div className="panel-sunken relative overflow-hidden">
      <div className="bench-grid-fine absolute inset-0 opacity-50" aria-hidden />
      {lendo && !estavel && <div className="scanline absolute inset-0" aria-hidden />}

      <div className="relative px-6 py-7">
        <div className="flex items-start justify-between">
          <p className="label-micro">Leitura potenciométrica</p>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[0.68rem] font-medium',
              !lendo
                ? 'border-border text-muted-foreground'
                : estavel
                  ? 'border-[hsl(var(--success)/0.4)] bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]'
                  : 'border-[hsl(var(--warning)/0.4)] bg-[hsl(var(--warning)/0.12)] text-[hsl(var(--warning))]',
            )}
          >
            <span
              className={cn('h-1.5 w-1.5 rounded-full bg-current', lendo && !estavel && 'animate-blink')}
              aria-hidden
            />
            {!lendo ? 'Em espera' : estavel ? 'Estável' : 'Estabilizando'}
          </span>
        </div>

        <div className="mt-4 flex items-end gap-3">
          <span
            className={cn(
              'num text-[4.5rem] font-semibold leading-[0.85] transition-colors duration-300',
              // sem leitura o traço fica espaçado, para não virar um bloco cinza
              temLeitura ? 'tracking-tighter' : 'tracking-[0.06em] opacity-35',
            )}
            style={{ color: cor, textShadow: temLeitura ? `0 0 36px ${cor}22` : undefined }}
          >
            {texto}
          </span>
          <span className="label-micro mb-2.5">pH</span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
          <Leitura rotulo="Potencial" valor={Number.isFinite(mV) ? numero(mV, 1) : '—'} unidade="mV" />
          <Leitura rotulo="Temperatura" valor={Number.isFinite(temperatura) ? numero(temperatura, 1) : '—'} unidade="°C" />
          <Leitura
            rotulo="Deriva"
            valor={Number.isFinite(derivaMvPorMin) ? numero(derivaMvPorMin, 2) : '—'}
            unidade="mV/min"
            /* Infinita = ainda não há sinal, não é alerta. E uma vez dada por
               estável, a oscilação residual do eletrodo não deve contradizer
               o selo de estabilidade no canto do mostrador. */
            alerta={!estavel && Number.isFinite(derivaMvPorMin) && derivaMvPorMin > 0.6}
          />
          <Leitura rotulo="Decorrido" valor={numero(tempoS, 0)} unidade="s" />
        </div>

        {temLeitura && (
          <div className="mt-6">
            <ReguaPh valor={ph} compacta />
          </div>
        )}
      </div>
    </div>
  );
}

function Leitura({
  rotulo, valor, unidade, alerta,
}: { rotulo: string; valor: string; unidade: string; alerta?: boolean }) {
  return (
    <div>
      <p className="label-micro mb-1">{rotulo}</p>
      <p className={cn('num text-sm font-medium', alerta ? 'text-[hsl(var(--warning))]' : 'text-foreground')}>
        {valor}
        <span className="ml-1 text-[0.68rem] font-normal text-muted-foreground">{unidade}</span>
      </p>
    </div>
  );
}

/* ---------------- Gráfico do trace ---------------- */

export function GraficoTrace({
  trace, altura = 180, phAlvo, mostrarMv,
}: {
  trace: PontoTrace[];
  altura?: number;
  phAlvo?: number;
  mostrarMv?: boolean;
}) {
  const dados = useMemo(
    () => trace.map((p) => ({
      t: Number(p.t.toFixed(1)),
      ph: Number(p.ph.toFixed(3)),
      mV: Number(p.mV.toFixed(2)),
    })),
    [trace],
  );

  if (dados.length < 2) {
    return (
      <div
        className="panel-sunken flex items-center justify-center text-xs text-muted-foreground"
        style={{ height: altura }}
      >
        Aguardando sinal do eletrodo…
      </div>
    );
  }

  const chave = mostrarMv ? 'mV' : 'ph';
  const ultimo = dados[dados.length - 1];
  const cor = mostrarMv ? 'hsl(var(--primary))' : corDoPh(ultimo.ph);

  return (
    <div style={{ height: altura }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={dados} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <defs>
            <linearGradient id={`grad-${chave}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={cor} stopOpacity={0.3} />
              <stop offset="100%" stopColor={cor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="hsl(var(--line-soft))" strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="t"
            type="number"
            domain={['dataMin', 'dataMax']}
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontFamily: 'var(--font-mono)' }}
            tickLine={false}
            axisLine={{ stroke: 'hsl(var(--line-soft))' }}
            tickFormatter={(v: number) => `${Math.round(v)}s`}
            minTickGap={44}
          />
          <YAxis
            domain={['auto', 'auto']}
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontFamily: 'var(--font-mono)' }}
            tickLine={false}
            axisLine={false}
            width={46}
          />
          <Tooltip
            contentStyle={{
              background: 'hsl(var(--popover))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 'var(--radius-sm)',
              fontSize: 12,
              fontFamily: 'var(--font-mono)',
            }}
            labelFormatter={(v) => `${v} s`}
            formatter={(v: number) => [mostrarMv ? `${v} mV` : `pH ${v}`, '']}
          />
          {phAlvo !== undefined && !mostrarMv && (
            <ReferenceLine y={phAlvo} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />
          )}
          <Area
            type="monotone"
            dataKey={chave}
            stroke={cor}
            strokeWidth={2}
            fill={`url(#grad-${chave})`}
            isAnimationActive={false}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ---------------- Distribuição por faixa ---------------- */

export function HistogramaPh({
  valores, extrator = 'H2O',
}: {
  valores: number[];
  extrator?: 'H2O' | 'CaCl2';
}) {
  const faixas = useMemo(() => {
    const baldes = Array.from({ length: 12 }, (_, i) => ({
      rotulo: `${(3 + i * 0.5).toFixed(1)}`,
      min: 3 + i * 0.5,
      max: 3.5 + i * 0.5,
      n: 0,
    }));
    for (const v of valores) {
      const b = baldes.find((x) => v >= x.min && v < x.max);
      if (b) b.n++;
      else if (v >= 9) baldes[baldes.length - 1].n++;
    }
    return baldes;
  }, [valores]);

  const maior = Math.max(1, ...faixas.map((f) => f.n));

  return (
    <div>
      <div className="flex h-32 items-end gap-1">
        {faixas.map((f) => (
          <div key={f.rotulo} className="group flex flex-1 flex-col items-center gap-1">
            <span className="num text-[0.6rem] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
              {f.n}
            </span>
            <div
              className="w-full rounded-t-sm transition-all duration-500"
              style={{
                height: `${Math.max(2, (f.n / maior) * 100)}%`,
                background: corDoPh(f.min + 0.25),
                opacity: f.n === 0 ? 0.18 : 0.85,
              }}
              title={`pH ${f.min.toFixed(1)}–${f.max.toFixed(1)}: ${f.n} amostras`}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1">
        {faixas.map((f, i) => (
          <span key={f.rotulo} className="num flex-1 text-center text-[0.58rem] text-muted-foreground/70">
            {i % 2 === 0 ? f.min.toFixed(1) : ''}
          </span>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Distribuição de {valores.length} resultados · extrator {extrator === 'CaCl2' ? 'CaCl₂' : 'água'}
      </p>
    </div>
  );
}

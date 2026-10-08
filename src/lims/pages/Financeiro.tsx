/* ============================================================
   BANCADA — financeiro: contas a receber e a pagar
   ============================================================ */

import { useMemo, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, ComposedChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { ArrowDownCircle, ArrowUpCircle, CheckCircle2, Wallet } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

import { useAcoes, useBancada, useIndices } from '../data/store';
import { data as fData, diasEntre, moeda, moedaCompacta, numero } from '../lib/format';
import {
  BarraFiltros, CabecalhoPagina, Indicador, Pilula, Secao, Segmentos, Tabela, Vazio, filtrar,
} from '../components/primitivos';
import type { TomStatus } from '../components/primitivos';
import type { StatusTitulo, Titulo } from '../types';

const TOM: Record<StatusTitulo, TomStatus> = {
  aberto: 'info',
  pago: 'sucesso',
  vencido: 'erro',
  parcial: 'alerta',
  cancelado: 'neutro',
};

type Aba = 'receber' | 'pagar' | 'fluxo';

export default function Financeiro() {
  const { estado, pode } = useBancada();
  const { baixarTitulo } = useAcoes();
  const { clientePorId } = useIndices();

  const [aba, setAba] = useState<Aba>('receber');
  const [busca, setBusca] = useState('');

  const kpis = useMemo(() => {
    const receber = estado.titulos.filter((t) => t.tipo === 'receber');
    const pagar = estado.titulos.filter((t) => t.tipo === 'pagar');
    const emAberto = (l: Titulo[]) => l.filter((t) => t.status === 'aberto' || t.status === 'vencido')
      .reduce((s, t) => s + t.valor - t.valorPago, 0);
    const vencido = (l: Titulo[]) => l.filter((t) => t.status === 'vencido')
      .reduce((s, t) => s + t.valor - t.valorPago, 0);

    const mes = new Date().toISOString().slice(0, 7);
    const recebidoMes = receber.filter((t) => t.pagamento?.startsWith(mes)).reduce((s, t) => s + t.valorPago, 0);
    const pagoMes = pagar.filter((t) => t.pagamento?.startsWith(mes)).reduce((s, t) => s + t.valorPago, 0);

    return {
      aReceber: emAberto(receber),
      aPagar: emAberto(pagar),
      inadimplencia: vencido(receber),
      saldoMes: recebidoMes - pagoMes,
      recebidoMes, pagoMes,
    };
  }, [estado.titulos]);

  /* ---------- fluxo de caixa dos últimos 6 meses ---------- */
  const fluxo = useMemo(() => {
    const meses = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i), 1);
      const chave = d.toISOString().slice(0, 7);
      return {
        chave,
        rotulo: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
        receitas: 0, despesas: 0, saldo: 0,
      };
    });
    const indice = new Map(meses.map((m) => [m.chave, m]));

    for (const t of estado.titulos) {
      const ref = (t.pagamento ?? t.vencimento).slice(0, 7);
      const m = indice.get(ref);
      if (!m) continue;
      const valor = t.status === 'pago' ? t.valorPago : t.valor;
      if (t.tipo === 'receber') m.receitas += valor; else m.despesas += valor;
    }
    for (const m of meses) m.saldo = m.receitas - m.despesas;
    return meses;
  }, [estado.titulos]);

  /* ---------- aging ---------- */
  const aging = useMemo(() => {
    const faixas = [
      { rotulo: 'A vencer', min: -Infinity, max: 0, valor: 0, cor: 'hsl(var(--ph-9))' },
      { rotulo: '1–15 d', min: 1, max: 15, valor: 0, cor: 'hsl(var(--warning))' },
      { rotulo: '16–30 d', min: 16, max: 30, valor: 0, cor: 'hsl(var(--ph-4))' },
      { rotulo: '31–60 d', min: 31, max: 60, valor: 0, cor: 'hsl(var(--ph-2))' },
      { rotulo: '> 60 d', min: 61, max: Infinity, valor: 0, cor: 'hsl(var(--destructive))' },
    ];
    for (const t of estado.titulos) {
      if (t.tipo !== 'receber' || (t.status !== 'aberto' && t.status !== 'vencido')) continue;
      const atraso = diasEntre(t.vencimento);
      const f = faixas.find((x) => atraso >= x.min && atraso <= x.max);
      if (f) f.valor += t.valor - t.valorPago;
    }
    return faixas;
  }, [estado.titulos]);

  /* ---------- despesas por categoria ---------- */
  const porCategoria = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const t of estado.titulos) {
      if (t.tipo !== 'pagar') continue;
      mapa.set(t.categoria, (mapa.get(t.categoria) ?? 0) + t.valor);
    }
    return [...mapa.entries()]
      .map(([categoria, valor]) => ({ categoria, valor }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 7);
  }, [estado.titulos]);

  const listados = useMemo(() => {
    const tipo = aba === 'pagar' ? 'pagar' : 'receber';
    return filtrar(
      estado.titulos.filter((t) => t.tipo === tipo),
      busca,
      (t) => [t.numero, t.descricao, t.categoria, t.fornecedor, t.clienteId ? clientePorId.get(t.clienteId)?.nome : undefined],
    );
  }, [estado.titulos, aba, busca, clientePorId]);

  return (
    <>
      <CabecalhoPagina
        eyebrow="Gestão"
        titulo="Financeiro"
        descricao="Contas a receber e a pagar, fluxo de caixa realizado e composição das despesas do laboratório."
      >
        <div className="mt-6">
          <Segmentos
            valor={aba}
            aoMudar={setAba}
            opcoes={[
              { valor: 'receber', rotulo: 'A receber', contagem: estado.titulos.filter((t) => t.tipo === 'receber').length },
              { valor: 'pagar', rotulo: 'A pagar', contagem: estado.titulos.filter((t) => t.tipo === 'pagar').length },
              { valor: 'fluxo', rotulo: 'Fluxo de caixa' },
            ]}
          />
        </div>
      </CabecalhoPagina>

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador rotulo="A receber em aberto" valor={moedaCompacta(kpis.aReceber)} icone={ArrowUpCircle} detalhe={`${moedaCompacta(kpis.recebidoMes)} recebidos no mês`} />
        <Indicador rotulo="A pagar em aberto" valor={moedaCompacta(kpis.aPagar)} icone={ArrowDownCircle} detalhe={`${moedaCompacta(kpis.pagoMes)} pagos no mês`} />
        <Indicador rotulo="Inadimplência" valor={moedaCompacta(kpis.inadimplencia)} destaque={kpis.inadimplencia > 0} detalhe={`${numero(kpis.aReceber ? (kpis.inadimplencia / kpis.aReceber) * 100 : 0, 1)}% da carteira`} />
        <Indicador rotulo="Resultado do mês" valor={moedaCompacta(kpis.saldoMes)} icone={Wallet} variacao={kpis.pagoMes ? ((kpis.recebidoMes - kpis.pagoMes) / kpis.pagoMes) * 100 : undefined} />
      </div>

      {aba === 'fluxo' ? (
        <div className="space-y-5">
          <Secao titulo="Fluxo de caixa" descricao="Últimos 6 meses — receitas, despesas e resultado">
            <div className="h-[20rem] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={fluxo} margin={{ top: 10, right: 12, bottom: 0, left: 4 }}>
                  <CartesianGrid stroke="hsl(var(--line-soft))" strokeDasharray="2 4" vertical={false} />
                  <XAxis
                    dataKey="rotulo"
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false} axisLine={{ stroke: 'hsl(var(--line-soft))' }}
                  />
                  <YAxis
                    tickFormatter={(v: number) => moedaCompacta(v).replace('R$', '').trim()}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontFamily: 'var(--font-mono)' }}
                    tickLine={false} axisLine={false} width={56}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))',
                      borderRadius: 'var(--radius-sm)', fontSize: 12,
                    }}
                    formatter={(v: number) => moeda(v)}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Bar dataKey="receitas" name="Receitas" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  <Bar dataKey="despesas" name="Despesas" fill="hsl(var(--ph-2))" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  <Line type="monotone" dataKey="saldo" name="Resultado" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Secao>

          <div className="grid gap-5 lg:grid-cols-2">
            <Secao titulo="Aging do contas a receber" descricao="Distribuição por tempo de atraso">
              <ul className="space-y-3">
                {aging.map((f) => {
                  const total = aging.reduce((s, x) => s + x.valor, 0) || 1;
                  return (
                    <li key={f.rotulo}>
                      <div className="mb-1.5 flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{f.rotulo}</span>
                        <span className="num font-medium text-foreground">{moeda(f.valor)}</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-[hsl(var(--surface-sunken))]">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${(f.valor / total) * 100}%`, background: f.cor }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Secao>

            <Secao titulo="Despesas por categoria" descricao="Acumulado do período">
              <div className="h-[15rem] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={porCategoria} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 8 }}>
                    <CartesianGrid stroke="hsl(var(--line-soft))" strokeDasharray="2 4" horizontal={false} />
                    <XAxis
                      type="number" tickFormatter={(v: number) => moedaCompacta(v).replace('R$', '').trim()}
                      tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))', fontFamily: 'var(--font-mono)' }}
                      tickLine={false} axisLine={false}
                    />
                    <YAxis
                      type="category" dataKey="categoria" width={104}
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={false} axisLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: 'hsl(var(--surface-raised))' }}
                      contentStyle={{
                        background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))',
                        borderRadius: 'var(--radius-sm)', fontSize: 12,
                      }}
                      formatter={(v: number) => moeda(v)}
                    />
                    <Bar dataKey="valor" name="total" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                      {porCategoria.map((_, i) => <Cell key={i} fill={`hsl(var(--ph-${2 + i}))`} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Secao>
          </div>
        </div>
      ) : (
        <Secao semPadding>
          <div className="px-5 pt-5">
            <BarraFiltros busca={busca} aoBuscar={setBusca} placeholder="Buscar por número, descrição, categoria ou cliente…" />
          </div>
          <Tabela
            colunas={[
              { chave: 'numero', titulo: 'Título', valor: (t) => t.numero, render: (t) => <span className="num text-xs font-medium">{t.numero}</span> },
              {
                chave: 'descricao', titulo: aba === 'receber' ? 'Cliente' : 'Fornecedor',
                valor: (t) => (aba === 'receber' ? clientePorId.get(t.clienteId ?? '')?.nome ?? '' : t.fornecedor ?? ''),
                render: (t) => (
                  <span className="block min-w-0">
                    <span className="block truncate text-xs text-foreground">
                      {aba === 'receber' ? clientePorId.get(t.clienteId ?? '')?.nomeFantasia ?? '—' : t.fornecedor}
                    </span>
                    <span className="block truncate text-[0.66rem] text-muted-foreground">{t.descricao}</span>
                  </span>
                ),
              },
              { chave: 'categoria', titulo: 'Categoria', secundaria: true, render: (t) => <span className="text-xs text-muted-foreground">{t.categoria}</span> },
              { chave: 'emissao', titulo: 'Emissão', alinhamento: 'direita', secundaria: true, valor: (t) => t.emissao, render: (t) => <span className="num text-xs text-muted-foreground">{fData(t.emissao)}</span> },
              {
                chave: 'vencimento', titulo: 'Vencimento', alinhamento: 'direita', valor: (t) => t.vencimento,
                render: (t) => {
                  const atraso = diasEntre(t.vencimento);
                  const emAtraso = t.status === 'vencido';
                  return (
                    <span className={cn('num text-xs', emAtraso ? 'text-destructive' : 'text-muted-foreground')}>
                      {fData(t.vencimento)}
                      {emAtraso && <span className="ml-1">({atraso}d)</span>}
                    </span>
                  );
                },
              },
              { chave: 'valor', titulo: 'Valor', alinhamento: 'direita', valor: (t) => t.valor, render: (t) => <span className="num text-xs font-medium">{moeda(t.valor)}</span> },
              {
                chave: 'status', titulo: 'Status', alinhamento: 'direita', valor: (t) => t.status,
                render: (t) => <Pilula tom={TOM[t.status]} className="px-1.5 py-0 text-[0.62rem]">{t.status}</Pilula>,
              },
              ...(pode('financeiro:editar') ? [{
                chave: 'acao', titulo: '', alinhamento: 'direita' as const,
                render: (t: Titulo) => (t.status === 'aberto' || t.status === 'vencido') ? (
                  <Button
                    size="sm" variant="ghost" className="h-6 gap-1 px-2 text-[0.68rem]"
                    onClick={(e) => {
                      e.stopPropagation();
                      baixarTitulo(t.id);
                      toast.success(`Título ${t.numero} baixado`, { description: moeda(t.valor) });
                    }}
                  >
                    <CheckCircle2 className="h-3 w-3" /> baixar
                  </Button>
                ) : null,
              }] : []),
            ]}
            dados={listados.slice(0, 100)}
            chaveDe={(t) => t.id}
            ordenacaoInicial={{ chave: 'vencimento', direcao: 'asc' }}
            vazio={<Vazio icone={Wallet} titulo="Nenhum título encontrado" />}
            rodape={
              <tr>
                <td colSpan={4} className="px-4 py-3 text-xs text-muted-foreground">
                  {listados.length} títulos
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="label-micro">total</span>
                </td>
                <td className="num px-4 py-3 text-right text-xs font-semibold text-foreground">
                  {moeda(listados.reduce((s, t) => s + t.valor, 0))}
                </td>
                <td colSpan={2} />
              </tr>
            }
          />
        </Secao>
      )}
    </>
  );
}

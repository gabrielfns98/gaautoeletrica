/* ============================================================
   BANCADA — painel de operação
   ============================================================ */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  ArrowRight, Clock, FlaskConical, TableProperties, TestTubes, TrendingUp, TriangleAlert, Wallet,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

import { useBancada, useIndices } from '../data/store';
import { podeLer } from '../lib/equipamento';
import { data as fData, diasEntre, moeda, moedaCompacta, numero, tempoRelativo } from '../lib/format';
import { BarraProporcao, CabecalhoPagina, Indicador, Pilula, Secao, Tabela, Vazio } from '../components/primitivos';
import { ChipPh } from '../components/ph-visual';
import type { Amostra } from '../types';
import { rota } from '../base';

const CORES_STATUS: Record<string, string> = {
  recebida: 'hsl(var(--primary))',
  preparo: 'hsl(var(--primary) / 0.6)',
  'em-analise': 'hsl(var(--primary))',
  'aguardando-revisao': 'hsl(var(--warning))',
  liberada: 'hsl(var(--success))',
  cancelada: 'hsl(var(--muted-foreground))',
};

const ROTULO_STATUS: Record<string, string> = {
  recebida: 'Recebida',
  preparo: 'Preparo',
  'em-analise': 'Em análise',
  'aguardando-revisao': 'Aguardando revisão',
  liberada: 'Liberada',
  cancelada: 'Cancelada',
};

export default function Painel() {
  const { estado, usuario, unidade } = useBancada();
  const { clientePorId, parametroPorId, usuarioPorId } = useIndices();

  /* ---------- indicadores ---------- */

  const kpis = useMemo(() => {
    const emAnalise = estado.amostras.filter((a) => a.status === 'em-analise').length;
    const atrasadas = estado.amostras.filter(
      (a) => !['liberada', 'cancelada'].includes(a.status) && new Date(a.prazoEntrega) < new Date(),
    );

    const liberadas = estado.amostras.filter((a) => a.status === 'liberada');
    const prazoMedio = liberadas.length === 0 ? 0
      : liberadas.reduce((s, a) => s + diasEntre(a.dataRecepcao, a.prazoEntrega), 0) / liberadas.length;

    /* Determinações lidas hoje, de qualquer ensaio: num laboratório de
       solos o pH é um entre dezenas, e contar só ele dava um número
       que não descrevia o dia de ninguém. */
    const hoje = new Date().toDateString();
    const lidosHoje = estado.ensaios.filter(
      (e) => e.dataLeitura && new Date(e.dataLeitura).toDateString() === hoje,
    ).length;
    const pendentes = estado.ensaios.filter(
      (e) => e.status === 'pendente' || e.status === 'em-bancada',
    ).length;

    const mesAtual = new Date().toISOString().slice(0, 7);
    const notasDoMes = estado.notasFiscais
      .filter((n) => n.competencia === mesAtual && n.status === 'autorizada');
    const faturado = notasDoMes.reduce((s, n) => s + n.valorServicos, 0);

    const vencidos = estado.titulos.filter((t) => t.tipo === 'receber' && t.status === 'vencido');
    const inadimplencia = vencidos.reduce((s, t) => s + t.valor - t.valorPago, 0);

    return {
      emAnalise, atrasadas, prazoMedio, lidosHoje, pendentes, faturado, inadimplencia,
      vencidos: vencidos.length, notasDoMes: notasDoMes.length,
    };
  }, [estado]);

  /* ---------- fluxo dos últimos 14 dias ---------- */

  const fluxo = useMemo(() => {
    const dias = Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      return { chave: d.toDateString(), rotulo: fData(d).slice(0, 5), recebidas: 0, liberadas: 0 };
    });
    const indice = new Map(dias.map((d) => [d.chave, d]));

    for (const a of estado.amostras) {
      const rec = indice.get(new Date(a.dataRecepcao).toDateString());
      if (rec) rec.recebidas++;
    }
    for (const l of estado.laudos) {
      if (!l.emitidoEm) continue;
      const lib = indice.get(new Date(l.emitidoEm).toDateString());
      if (lib) lib.liberadas += l.amostraIds.length;
    }
    return dias;
  }, [estado.amostras, estado.laudos]);

  /* ---------- distribuição de status ---------- */

  const porStatus = useMemo(() => {
    const contagem = new Map<string, number>();
    for (const a of estado.amostras) contagem.set(a.status, (contagem.get(a.status) ?? 0) + 1);
    return Object.keys(ROTULO_STATUS).map((s) => ({
      rotulo: ROTULO_STATUS[s],
      valor: contagem.get(s) ?? 0,
      cor: CORES_STATUS[s],
    }));
  }, [estado.amostras]);

  /* ---------- carga da bancada ---------- */

  /** Ensaios parados, por análise: onde a fila realmente está. */
  const filaPorGrupo = useMemo(() => {
    const porGrupo = new Map<string, { pendentes: number; emBancada: number }>();
    const grupoDo = new Map(estado.parametros.map((p) => [p.id, p.grupoId]));

    for (const e of estado.ensaios) {
      if (e.status !== 'pendente' && e.status !== 'em-bancada') continue;
      const g = grupoDo.get(e.parametroId);
      if (!g) continue;
      const atual = porGrupo.get(g) ?? { pendentes: 0, emBancada: 0 };
      if (e.status === 'pendente') atual.pendentes += 1; else atual.emBancada += 1;
      porGrupo.set(g, atual);
    }

    return [...porGrupo.entries()]
      .map(([id, n]) => ({
        id,
        nome: estado.grupos.find((g) => g.id === id)?.nome ?? id,
        ...n,
        total: n.pendentes + n.emBancada,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [estado.ensaios, estado.parametros, estado.grupos]);

  /** Produtividade por determinação, não por leitura de pH. */
  const produtividade = useMemo(() => {
    const porAnalista = new Map<string, number>();
    for (const e of estado.ensaios) {
      if (!e.analistaId || !e.dataLeitura) continue;
      porAnalista.set(e.analistaId, (porAnalista.get(e.analistaId) ?? 0) + 1);
    }
    return [...porAnalista.entries()]
      .map(([id, n]) => ({ nome: usuarioPorId.get(id)?.nome.split(' ')[0] ?? '—', leituras: n }))
      .sort((a, b) => b.leituras - a.leituras)
      .slice(0, 6);
  }, [estado.ensaios, usuarioPorId]);

  /* ---------- equipamentos ---------- */

  /** Os últimos resultados lidos, de qualquer ensaio. */
  const ultimosResultados = useMemo(() => {
    const porId = new Map(estado.parametros.map((p) => [p.id, p]));
    return estado.ensaios
      .filter((e) => e.dataLeitura && e.valor !== undefined && porId.has(e.parametroId))
      .sort((a, b) => +new Date(b.dataLeitura!) - +new Date(a.dataLeitura!))
      .slice(0, 18)
      .map((ensaio) => ({
        ensaio,
        parametro: porId.get(ensaio.parametroId)!,
        amostra: estado.amostras.find((a) => a.id === ensaio.amostraId),
      }));
  }, [estado.ensaios, estado.parametros, estado.amostras]);

  /**
   * Estado metrológico de todo o parque, não só dos potenciômetros.
   * O painel mostra primeiro o que está impedido de ler: é a
   * informação que muda o que a bancada faz nos próximos minutos.
   */
  const estadoEquipamentos = useMemo(() => {
    const agora = new Date();
    const tipoPorId = new Map(estado.tiposEquipamento.map((t) => [t.id, t]));

    return estado.equipamentos
      .filter((e) => e.ativo)
      .map((e) => {
        const tipo = tipoPorId.get(e.tipo);
        const ehPh = tipo?.verificacao === 'calibracao-multiponto';
        const calibracao = estado.calibracoes
          .filter((x) => x.equipamentoId === e.id)
          .sort((a, b) => +new Date(b.data) - +new Date(a.data))[0];

        const liberacao = ehPh
          ? {
            permitido: calibracao?.status === 'valida' && new Date(calibracao.validaAte) > agora,
            motivo: 'Calibração vencida ou reprovada',
          }
          : podeLer(e, tipo, estado.verificacoesEquipamento, agora);

        return { equipamento: e, tipo, calibracao, ok: liberacao.permitido, motivo: liberacao.motivo };
      })
      .filter((x) => x.tipo?.verificacao !== 'nenhuma')
      // Primeiro o que está bloqueado: é o que muda a próxima hora.
      .sort((a, b) => Number(a.ok) - Number(b.ok))
      .slice(0, 6);
  }, [estado.equipamentos, estado.calibracoes, estado.tiposEquipamento, estado.verificacoesEquipamento]);

  const saudacao = new Date().getHours() < 12 ? 'Bom dia' : new Date().getHours() < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <>
      <CabecalhoPagina
        eyebrow={`${unidade.codigo} · ${unidade.sigla}`}
        titulo={`${saudacao}, ${usuario.nome.split(' ')[0]}`}
        descricao={`${unidade.nome} — ${unidade.acreditacao ?? 'laboratório de ensaio'}`}
        acoes={
          <Button asChild className="gap-2">
            <Link to={rota('/resultados')}>
              <TableProperties className="h-4 w-4" /> Lançar resultados
            </Link>
          </Button>
        }
      />

      <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador
          rotulo="Amostras em análise"
          valor={kpis.emAnalise}
          detalhe={`${estado.amostras.length} no acervo do período`}
          icone={TestTubes}
        />
        <Indicador
          rotulo="Determinações hoje"
          valor={kpis.lidosHoje}
          detalhe={`${kpis.pendentes} ensaios na fila`}
          icone={FlaskConical}
          destaque
        />
        <Indicador
          rotulo="Faturamento do mês"
          valor={moedaCompacta(kpis.faturado)}
          detalhe={`${kpis.notasDoMes} ${kpis.notasDoMes === 1 ? 'nota autorizada' : 'notas autorizadas'} na competência`}
          icone={Wallet}
        />
        <Indicador
          rotulo="A receber vencido"
          valor={moedaCompacta(kpis.inadimplencia)}
          detalhe={`${kpis.vencidos} títulos em atraso`}
          icone={TrendingUp}
        />
      </div>

      {kpis.atrasadas.length > 0 && (
        <div className="animate-rise mt-5 flex flex-wrap items-center gap-3 rounded-[var(--radius-lg)] border border-[hsl(var(--warning)/0.3)] bg-[hsl(var(--warning)/0.08)] px-5 py-4">
          <TriangleAlert className="h-4 w-4 shrink-0 text-[hsl(var(--warning))]" />
          <p className="flex-1 text-sm text-foreground">
            <span className="num font-semibold">{kpis.atrasadas.length}</span> amostras ultrapassaram o
            prazo de entrega combinado.
          </p>
          <Button asChild variant="ghost" size="sm" className="gap-1.5 text-xs">
            <Link to={rota('/amostras')}>ver amostras <ArrowRight className="h-3.5 w-3.5" /></Link>
          </Button>
        </div>
      )}

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Secao
          titulo="Fluxo de amostras"
          descricao="Entradas e liberações nos últimos 14 dias"
          className="xl:col-span-2"
        >
          <div className="h-[16rem] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={fluxo} margin={{ top: 8, right: 10, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="g-rec" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g-lib" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="hsl(var(--line-soft))" strokeDasharray="2 4" vertical={false} />
                <XAxis
                  dataKey="rotulo"
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontFamily: 'var(--font-mono)' }}
                  tickLine={false} axisLine={{ stroke: 'hsl(var(--line-soft))' }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontFamily: 'var(--font-mono)' }}
                  tickLine={false} axisLine={false} width={40}
                />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))',
                    borderRadius: 'var(--radius-sm)', fontSize: 12,
                  }}
                />
                <Area type="monotone" dataKey="recebidas" name="Recebidas" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#g-rec)" isAnimationActive={false} />
                <Area type="monotone" dataKey="liberadas" name="Liberadas" stroke="hsl(var(--success))" strokeWidth={2} fill="url(#g-lib)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex gap-5">
            <Legenda cor="hsl(var(--primary))" rotulo="Recebidas" />
            <Legenda cor="hsl(var(--success))" rotulo="Liberadas em laudo" />
          </div>
        </Secao>

        <Secao titulo="Situação do acervo" descricao={`${estado.amostras.length} amostras`}>
          <BarraProporcao segmentos={porStatus} altura={10} />
          <div className="mt-6 space-y-3 border-t border-[hsl(var(--line-soft))] pt-5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Prazo médio contratado</span>
              <span className="num font-medium text-foreground">{numero(kpis.prazoMedio, 1)} dias</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Lotes de recepção</span>
              <span className="num font-medium text-foreground">{estado.lotesRecepcao.length}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Ensaios cadastrados</span>
              <span className="num font-medium text-foreground">{estado.ensaios.length}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Clientes ativos</span>
              <span className="num font-medium text-foreground">{estado.clientes.filter((c) => c.ativo).length}</span>
            </div>
          </div>
        </Secao>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Secao
          titulo="Ensaios pendentes por análise"
          descricao="Onde a fila está parada agora"
          className="xl:col-span-2"
        >
          {filaPorGrupo.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">
              Nenhum ensaio na fila — a bancada está em dia.
            </p>
          ) : (
            <ul className="space-y-3">
              {filaPorGrupo.map((g) => {
                const maior = filaPorGrupo[0].total || 1;
                return (
                  <li key={g.id}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-3">
                      <span className="truncate text-xs text-foreground">{g.nome}</span>
                      <span className="num shrink-0 text-xs text-muted-foreground">
                        {g.emBancada > 0 && (
                          <span className="text-[hsl(var(--primary))]">{g.emBancada} em bancada · </span>
                        )}
                        {g.pendentes} pendentes
                      </span>
                    </div>
                    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-[hsl(var(--surface-sunken))]">
                      <div
                        className="h-full bg-[hsl(var(--primary))] transition-all duration-500"
                        style={{ width: `${(g.emBancada / maior) * 100}%` }}
                      />
                      <div
                        className="h-full bg-[hsl(var(--muted-foreground)/0.4)] transition-all duration-500"
                        style={{ width: `${(g.pendentes / maior) * 100}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Secao>

        <Secao titulo="Equipamentos" descricao="Controle metrológico do parque">
          <ul className="space-y-3">
            {estadoEquipamentos.map(({ equipamento, tipo, calibracao, ok, motivo }) => (
              <li key={equipamento.id} className="panel-sunken p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="num text-sm font-medium text-foreground">{equipamento.tag}</p>
                    <p className="truncate text-[0.68rem] text-muted-foreground">
                      {tipo?.nome ?? equipamento.nome}
                    </p>
                  </div>
                  <Pilula tom={ok ? 'sucesso' : 'erro'} className="shrink-0 px-1.5 py-0 text-[0.62rem]">
                    {ok ? 'liberado' : 'bloqueado'}
                  </Pilula>
                </div>

                {/* O potenciômetro mostra slope e offset porque são os
                    números que o analista usa para decidir trocar o
                    eletrodo; os demais mostram a última verificação. */}
                {calibracao && tipo?.verificacao === 'calibracao-multiponto' ? (
                  <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="num text-[0.68rem] text-muted-foreground">
                      slope <span className="text-foreground">{numero(calibracao.slopePercentual, 1)}%</span>
                    </span>
                    <span className="num text-[0.68rem] text-muted-foreground">
                      offset <span className="text-foreground">{numero(calibracao.offsetMv, 1)} mV</span>
                    </span>
                    <span className="ml-auto text-[0.68rem] text-muted-foreground">
                      {tempoRelativo(calibracao.data)}
                    </span>
                  </div>
                ) : (
                  !ok && motivo && (
                    <p className="mt-2 text-[0.66rem] leading-relaxed text-muted-foreground">{motivo}</p>
                  )
                )}
              </li>
            ))}
          </ul>
          <Button asChild variant="outline" size="sm" className="mt-4 w-full gap-1.5 text-xs">
            <Link to={rota('/equipamentos')}>Ver parque <ArrowRight className="h-3.5 w-3.5" /></Link>
          </Button>
        </Secao>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Secao
          titulo="Próximas do prazo"
          descricao="Amostras abertas ordenadas pelo vencimento"
          className="xl:col-span-2"
          semPadding
        >
          <Tabela
            denso
            colunas={[
              { chave: 'protocolo', titulo: 'Protocolo', valor: (a) => a.protocolo, render: (a) => <span className="num text-xs font-medium">{a.protocolo}</span> },
              { chave: 'cliente', titulo: 'Cliente', secundaria: true, render: (a) => <span className="truncate text-xs">{clientePorId.get(a.clienteId)?.nomeFantasia}</span> },
              { chave: 'id', titulo: 'Identificação', render: (a) => <span className="truncate text-xs text-muted-foreground">{a.identificacaoCampo}</span> },
              {
                chave: 'status', titulo: 'Status',
                render: (a) => (
                  <Pilula tom="neutro" className="px-1.5 py-0 text-[0.62rem]">
                    {ROTULO_STATUS[a.status]}
                  </Pilula>
                ),
              },
              {
                chave: 'prazo', titulo: 'Prazo', alinhamento: 'direita',
                valor: (a) => a.prazoEntrega,
                render: (a) => {
                  const atrasada = new Date(a.prazoEntrega) < new Date();
                  return (
                    <span className={atrasada ? 'num text-xs text-destructive' : 'num text-xs text-muted-foreground'}>
                      {tempoRelativo(a.prazoEntrega)}
                    </span>
                  );
                },
              },
            ]}
            dados={estado.amostras
              .filter((a) => !['liberada', 'cancelada'].includes(a.status))
              .sort((a, b) => +new Date(a.prazoEntrega) - +new Date(b.prazoEntrega))
              .slice(0, 9)}
            chaveDe={(a) => a.id}
            vazio={<Vazio icone={Clock} titulo="Nenhuma amostra em aberto" />}
          />
        </Secao>

        <Secao titulo="Produtividade na bancada" descricao="Determinações lidas por analista">
          <div className="h-[13rem] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={produtividade} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 8 }}>
                <CartesianGrid stroke="hsl(var(--line-soft))" strokeDasharray="2 4" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontFamily: 'var(--font-mono)' }}
                  tickLine={false} axisLine={false}
                />
                <YAxis
                  type="category" dataKey="nome" width={64}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false} axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--surface-raised))' }}
                  contentStyle={{
                    background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))',
                    borderRadius: 'var(--radius-sm)', fontSize: 12,
                  }}
                />
                {/* Uma cor só: a barra compara quantidade, e dar um
                    matiz diferente a cada analista sugeria uma
                    classificação que não existe. */}
                <Bar
                  dataKey="leituras" name="determinações" radius={[0, 4, 4, 0]}
                  fill="hsl(var(--primary))" isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Secao>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Secao titulo="Últimos resultados lançados" semPadding>
          <ScrollArea className="h-[17rem]">
            <ul className="divide-y divide-[hsl(var(--line-soft))]">
              {ultimosResultados.map(({ ensaio, parametro, amostra }) => (
                <li key={ensaio.id} className="flex items-center gap-3 px-5 py-3">
                  {/* O chip colorido fica para o pH, onde a cor tem
                      significado agronômico; os demais ensaios mostram
                      o número e a unidade, sem cor inventada. */}
                  <span className="w-16 shrink-0 text-right">
                    {parametro.ehPh ? (
                      <ChipPh valor={ensaio.valor} extrator={parametro.extrator ?? 'H2O'} tamanho="sm" />
                    ) : (
                      <span className="num text-xs text-foreground">
                        {numero(ensaio.valor ?? 0, parametro.casasDecimais)}
                      </span>
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="num truncate text-xs font-medium text-foreground">{amostra?.protocolo}</p>
                    <p className="truncate text-[0.68rem] text-muted-foreground">
                      {parametro.nome}
                      {parametro.unidade && <span className="num"> · {parametro.unidade}</span>}
                    </p>
                  </div>
                  <span className="shrink-0 text-[0.66rem] text-muted-foreground">
                    {tempoRelativo(ensaio.dataLeitura!)}
                  </span>
                </li>
              ))}
            </ul>
          </ScrollArea>
        </Secao>

        <Secao titulo="Trilha de auditoria" descricao="Tudo que muda fica registrado" semPadding>
          <ScrollArea className="h-[17rem]">
            <ul className="divide-y divide-[hsl(var(--line-soft))]">
              {estado.auditoria.slice(0, 18).map((r) => (
                <li key={r.id} className="px-5 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-xs font-medium text-foreground">{r.acao}</p>
                    <span className="shrink-0 text-[0.66rem] text-muted-foreground">{tempoRelativo(r.data)}</span>
                  </div>
                  <p className="mt-0.5 truncate text-[0.7rem] text-muted-foreground">{r.detalhe}</p>
                  <p className="mt-0.5 text-[0.66rem] text-muted-foreground/70">
                    {usuarioPorId.get(r.usuarioId)?.nome}
                  </p>
                </li>
              ))}
            </ul>
          </ScrollArea>
        </Secao>
      </div>

      <p className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <FlaskConical className="h-3.5 w-3.5" />
        {moeda(estado.titulos.filter((t) => t.tipo === 'receber' && t.status === 'aberto').reduce((s, t) => s + t.valor, 0))} a receber em aberto
      </p>
    </>
  );
}

function Legenda({ cor, rotulo }: { cor: string; rotulo: string }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="h-2 w-2 rounded-sm" style={{ background: cor }} aria-hidden />
      {rotulo}
    </span>
  );
}

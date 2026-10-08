/* ============================================================
   BANCADA — controle de qualidade da potenciometria
   Carta de Levey-Jennings com as regras de Westgard aplicadas
   a cada novo ponto da série.
   ============================================================ */

import { useMemo, useState } from 'react';
import {
  CartesianGrid, Line, LineChart, ReferenceArea, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { CheckCircle2, ShieldAlert, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { useAcoes, useBancada, useIndices } from '../../data/store';
import { avaliarCQ } from '../../lib/ph';
import { data as fData, dataHora, numero, tempoRelativo } from '../../lib/format';
import { Indicador, Pilula, Secao, Tabela, Vazio } from '../../components/primitivos';
import type { RegistroCQ } from '../../types';

export default function ControleQualidade() {
  const { estado, pode } = useBancada();
  const { registrarCQ } = useAcoes();
  const { usuarioPorId, equipamentoPorId, controlePorId } = useIndices();

  const [controleId, setControleId] = useState(estado.amostrasControle[0]?.id ?? '');
  const [equipamentoId, setEquipamentoId] = useState(
    estado.equipamentos.find((e) => e.tipo === 'phmetro')?.id ?? '',
  );
  const [valor, setValor] = useState('');

  const controle = estado.amostrasControle.find((c) => c.id === controleId);
  const phmetros = estado.equipamentos.filter((e) => e.tipo === 'phmetro' && e.ativo);

  const serie = useMemo(
    () => estado.registrosCQ
      .filter((r) => r.controleId === controleId)
      .sort((a, b) => +new Date(a.data) - +new Date(b.data)),
    [estado.registrosCQ, controleId],
  );

  const dadosCarta = useMemo(
    () => serie.slice(-40).map((r, i) => ({
      i: i + 1,
      data: fData(r.data),
      valor: Number(r.valorMedido.toFixed(3)),
      z: Number(r.zScore.toFixed(2)),
      resultado: r.resultado,
    })),
    [serie],
  );

  const resumo = useMemo(() => {
    const ultimos30 = serie.slice(-30);
    const n = ultimos30.length || 1;
    const media = ultimos30.reduce((s, r) => s + r.valorMedido, 0) / n;
    const dp = n < 2 ? 0 : Math.sqrt(ultimos30.reduce((s, r) => s + (r.valorMedido - media) ** 2, 0) / (n - 1));
    return {
      media,
      dp,
      vies: controle ? media - controle.valorAlvo : 0,
      reprovados: ultimos30.filter((r) => r.resultado === 'reprovado').length,
      alertas: ultimos30.filter((r) => r.resultado === 'alerta').length,
      total: ultimos30.length,
    };
  }, [serie, controle]);

  /** Prévia do veredito antes de gravar. */
  const previa = useMemo(() => {
    const v = Number(valor.replace(',', '.'));
    if (!controle || !Number.isFinite(v)) return null;
    const historico = [...serie.slice(-9).map((r) => r.valorMedido), v];
    return avaliarCQ(historico, controle.valorAlvo, controle.desvioPadrao);
  }, [valor, controle, serie]);

  const gravar = () => {
    const v = Number(valor.replace(',', '.'));
    if (!controle || !Number.isFinite(v)) {
      toast.error('Informe o valor medido no controle.');
      return;
    }
    const r = registrarCQ(controle.id, equipamentoId, v);
    setValor('');
    if (r.resultado === 'reprovado') {
      toast.error(`Série rejeitada — regra ${r.regraViolada}`, {
        description: 'Recalibre o eletrodo e repita a corrida antes de liberar resultados.',
      });
    } else if (r.resultado === 'alerta') {
      toast.warning('Ponto em advertência', { description: 'Acompanhe a próxima corrida de perto.' });
    } else {
      toast.success('Controle dentro dos limites.');
    }
  };

  if (!controle) {
    return <Secao><Vazio icone={ShieldAlert} titulo="Nenhuma amostra-controle cadastrada" /></Secao>;
  }

  const limites = {
    alvo: controle.valorAlvo,
    s1: controle.desvioPadrao,
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador
          rotulo="Viés nos últimos 30"
          valor={numero(resumo.vies, 3)}
          sufixo="pH"
          detalhe={`média ${numero(resumo.media, 3)} · alvo ${numero(controle.valorAlvo, 2)}`}
        />
        <Indicador
          rotulo="Desvio padrão"
          valor={numero(resumo.dp, 4)}
          detalhe={`declarado ${numero(controle.desvioPadrao, 3)}`}
        />
        <Indicador
          rotulo="Pontos reprovados"
          valor={resumo.reprovados}
          sufixo={`/ ${resumo.total}`}
          detalhe={`${resumo.alertas} em advertência`}
          destaque={resumo.reprovados > 0}
        />
        <Indicador
          rotulo="Validade do material"
          valor={tempoRelativo(controle.validade)}
          detalhe={`lote ${controle.lote}`}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <Secao
          titulo="Carta de Levey-Jennings"
          descricao={`${controle.nome} · limites em ±1σ, ±2σ e ±3σ`}
          acoes={
            <Select value={controleId} onValueChange={setControleId}>
              <SelectTrigger className="h-8 w-56 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {estado.amostrasControle.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        >
          <div className="h-[19rem] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dadosCarta} margin={{ top: 10, right: 14, bottom: 0, left: -14 }}>
                <CartesianGrid stroke="hsl(var(--line-soft))" strokeDasharray="2 4" vertical={false} />
                <ReferenceArea
                  y1={limites.alvo - limites.s1} y2={limites.alvo + limites.s1}
                  fill="hsl(var(--success))" fillOpacity={0.08}
                />
                {[1, 2, 3].map((k) => (
                  <ReferenceLine
                    key={`p${k}`} y={limites.alvo + k * limites.s1}
                    stroke={k === 3 ? 'hsl(var(--destructive))' : k === 2 ? 'hsl(var(--warning))' : 'hsl(var(--line-strong))'}
                    strokeDasharray="4 4"
                    label={{ value: `+${k}σ`, position: 'right', fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                  />
                ))}
                {[1, 2, 3].map((k) => (
                  <ReferenceLine
                    key={`m${k}`} y={limites.alvo - k * limites.s1}
                    stroke={k === 3 ? 'hsl(var(--destructive))' : k === 2 ? 'hsl(var(--warning))' : 'hsl(var(--line-strong))'}
                    strokeDasharray="4 4"
                    label={{ value: `−${k}σ`, position: 'right', fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                  />
                ))}
                <ReferenceLine y={limites.alvo} stroke="hsl(var(--primary))" strokeWidth={1.5} />
                <XAxis
                  dataKey="data"
                  tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))', fontFamily: 'var(--font-mono)' }}
                  tickLine={false} axisLine={{ stroke: 'hsl(var(--line-soft))' }} interval="preserveStartEnd"
                />
                <YAxis
                  domain={[limites.alvo - 3.8 * limites.s1, limites.alvo + 3.8 * limites.s1]}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontFamily: 'var(--font-mono)' }}
                  tickLine={false} axisLine={false} width={54}
                  tickFormatter={(v: number) => v.toFixed(2)}
                />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))',
                    borderRadius: 'var(--radius-sm)', fontSize: 12, fontFamily: 'var(--font-mono)',
                  }}
                  formatter={(v: number, _n, p) => [`${v}  (z = ${p.payload.z})`, 'medido']}
                />
                <Line
                  type="linear" dataKey="valor" stroke="hsl(var(--foreground))" strokeWidth={1.5}
                  isAnimationActive={false}
                  dot={(props) => {
                    const { cx, cy, payload, index } = props as { cx: number; cy: number; payload: { resultado: string }; index: number };
                    const cor = payload.resultado === 'reprovado' ? 'hsl(var(--destructive))'
                      : payload.resultado === 'alerta' ? 'hsl(var(--warning))'
                      : 'hsl(var(--primary))';
                    return <circle key={index} cx={cx} cy={cy} r={3} fill={cor} stroke="hsl(var(--background))" strokeWidth={1} />;
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Secao>

        <div className="space-y-5">
          <Secao titulo="Registrar controle">
            {pode('ph:criar') ? (
              <div className="space-y-4">
                <div>
                  <Label className="label-micro mb-2 block">Equipamento</Label>
                  <Select value={equipamentoId} onValueChange={setEquipamentoId}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {phmetros.map((e) => <SelectItem key={e.id} value={e.id}>{e.tag} — {e.modelo}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="label-micro mb-2 block" htmlFor="cq-valor">
                    Valor medido (alvo {numero(controle.valorAlvo, 2)})
                  </Label>
                  <Input
                    id="cq-valor" inputMode="decimal" value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') gravar(); }}
                    placeholder={controle.valorAlvo.toFixed(2)} className="num h-10 text-lg"
                  />
                </div>

                {previa && (
                  <div
                    className={cn(
                      'flex items-start gap-2.5 rounded-[var(--radius-sm)] border px-3 py-2.5',
                      previa.resultado === 'aprovado' ? 'border-[hsl(var(--success)/0.3)] bg-[hsl(var(--success)/0.1)]'
                        : previa.resultado === 'alerta' ? 'border-[hsl(var(--warning)/0.3)] bg-[hsl(var(--warning)/0.1)]'
                        : 'border-destructive/30 bg-destructive/10',
                    )}
                  >
                    {previa.resultado === 'aprovado'
                      ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[hsl(var(--success))]" />
                      : <TriangleAlert className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', previa.resultado === 'alerta' ? 'text-[hsl(var(--warning))]' : 'text-destructive')} />}
                    <div>
                      <p className="num text-xs font-medium text-foreground">z = {numero(previa.zScore, 2)}</p>
                      <p className="mt-0.5 text-[0.7rem] leading-relaxed text-muted-foreground">{previa.mensagem}</p>
                    </div>
                  </div>
                )}

                <Button onClick={gravar} className="w-full">Registrar ponto</Button>
              </div>
            ) : (
              <p className="py-4 text-center text-xs text-muted-foreground">Sem permissão para registrar controles.</p>
            )}
          </Secao>

          <Secao titulo="Regras de Westgard">
            <ul className="space-y-2 text-xs text-muted-foreground">
              {[
                ['1-3s', 'Um ponto além de 3σ — rejeita a corrida.'],
                ['2-2s', 'Dois consecutivos além de 2σ do mesmo lado — erro sistemático.'],
                ['R-4s', 'Amplitude maior que 4σ entre consecutivos — erro aleatório.'],
                ['4-1s', 'Quatro consecutivos além de 1σ do mesmo lado.'],
                ['10x', 'Dez consecutivos do mesmo lado da média — tendência.'],
              ].map(([regra, texto]) => (
                <li key={regra} className="flex gap-2.5">
                  <span className="num shrink-0 rounded bg-muted px-1.5 py-0.5 text-[0.62rem] font-medium text-foreground">
                    {regra}
                  </span>
                  <span className="leading-relaxed">{texto}</span>
                </li>
              ))}
            </ul>
          </Secao>
        </div>
      </div>

      <Secao titulo="Pontos recentes" semPadding>
        <Tabela
          denso
          colunas={[
            { chave: 'data', titulo: 'Data', valor: (r) => r.data, render: (r) => <span className="num text-xs">{dataHora(r.data)}</span> },
            { chave: 'controle', titulo: 'Controle', secundaria: true, render: (r) => <span className="text-xs">{controlePorId.get(r.controleId)?.nome}</span> },
            { chave: 'eq', titulo: 'Equipamento', render: (r) => <span className="num text-xs">{equipamentoPorId.get(r.equipamentoId)?.tag}</span> },
            { chave: 'analista', titulo: 'Analista', secundaria: true, render: (r) => <span className="text-xs">{usuarioPorId.get(r.analistaId)?.nome}</span> },
            { chave: 'valor', titulo: 'Medido', alinhamento: 'direita', valor: (r) => r.valorMedido, render: (r) => <span className="num text-xs">{numero(r.valorMedido, 3)}</span> },
            { chave: 'z', titulo: 'z', alinhamento: 'direita', valor: (r) => r.zScore, render: (r) => <span className="num text-xs">{numero(r.zScore, 2)}</span> },
            {
              chave: 'resultado', titulo: 'Veredito', alinhamento: 'direita',
              render: (r) => (
                <Pilula tom={r.resultado === 'aprovado' ? 'sucesso' : r.resultado === 'alerta' ? 'alerta' : 'erro'} className="px-1.5 py-0 text-[0.62rem]">
                  {r.regraViolada ?? r.resultado}
                </Pilula>
              ),
            },
          ]}
          dados={[...estado.registrosCQ].sort((a, b) => +new Date(b.data) - +new Date(a.data)).slice(0, 25)}
          chaveDe={(r) => r.id}
        />
      </Secao>
    </div>
  );
}

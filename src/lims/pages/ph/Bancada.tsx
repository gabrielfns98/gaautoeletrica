/* ============================================================
   BANCADA — estação de leitura de pH
   Fila de ensaios → instrumento → trace → réplicas → resultado.
   ============================================================ */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, CircleStop, Cpu, Hand, Play, Plug, RotateCcw,
  Save, Trash2, TriangleAlert, Usb,
} from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

import { useAcoes, useBancada, useCalibracaoVigente, useFilaPh } from '../../data/store';
import {
  CRITERIOS, analisarEstabilidade, analisarReplicas, classificarPh,
  corrigirPara25C, mvDePh, phDeMv,
} from '../../lib/ph';
import { SimuladorPh, SerialPh, serialDisponivel } from '../../lib/serial';
import type { FontePh, Protocolo } from '../../lib/serial';
import { duracao, numero, tempoRelativo } from '../../lib/format';
import { GraficoTrace, MostradorPh, ReguaPh } from '../../components/ph-visual';
import { Pilula, Secao, Vazio } from '../../components/primitivos';
import type { LeituraPh, PontoTrace } from '../../types';

type Modo = 'simulador' | 'instrumento' | 'manual';

/** pH plausível e estável para uma amostra, usado pela bancada virtual. */
function phSimulado(semente: string, extrator: string): number {
  let h = 2166136261;
  for (let i = 0; i < semente.length; i++) {
    h ^= semente.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const u = ((h >>> 0) % 10000) / 10000;
  if (extrator === 'SMP') return 4.9 + u * 1.9;
  if (extrator === 'CaCl2') return 3.9 + u * 2.5;
  if (extrator === 'direto') return 5.2 + u * 3.4;
  return 4.2 + u * 2.7;
}

export default function Bancada() {
  const { estado, usuario, pode } = useBancada();
  const { registrarLeitura } = useAcoes();
  const fila = useFilaPh();

  const phmetros = useMemo(
    () => estado.equipamentos.filter((e) => e.tipo === 'phmetro' && e.ativo),
    [estado.equipamentos],
  );

  const [equipamentoId, setEquipamentoId] = useState(phmetros[0]?.id ?? '');
  const [ensaioId, setEnsaioId] = useState<string | undefined>(fila[0]?.ensaio.id);
  const [modo, setModo] = useState<Modo>('simulador');
  const [protocolo, setProtocolo] = useState<Protocolo>('generico-ascii');

  const [lendo, setLendo] = useState(false);
  const [trace, setTrace] = useState<PontoTrace[]>([]);
  const [replicas, setReplicas] = useState<number[]>([]);
  const [manualPh, setManualPh] = useState('');
  const [manualTemp, setManualTemp] = useState('25.0');
  const [erroFonte, setErroFonte] = useState<string>();
  // Uma vez capturada a réplica, o mostrador fica travado em "Estável": o
  // ruído do eletrodo volta a cruzar o limiar de deriva e faria o rótulo
  // piscar entre os dois estados sem que nada de relevante tenha mudado.
  const [capturado, setCapturado] = useState(false);
  const [verMv, setVerMv] = useState(false);

  const fonteRef = useRef<FontePh | null>(null);
  const inicioRef = useRef(0);

  const equipamento = phmetros.find((e) => e.id === equipamentoId);
  const calibracao = useCalibracaoVigente(equipamentoId);
  const item = fila.find((f) => f.ensaio.id === ensaioId) ?? fila[0];

  const calibracaoOk = useMemo(() => {
    if (!calibracao) return false;
    return calibracao.status === 'valida' && new Date(calibracao.validaAte) > new Date();
  }, [calibracao]);

  /* ---------- aquisição ---------- */

  const pararLeitura = useCallback(async () => {
    setLendo(false);
    await fonteRef.current?.desconectar();
    fonteRef.current = null;
  }, []);

  // desliga o instrumento ao sair da tela
  useEffect(() => () => { void fonteRef.current?.desconectar(); }, []);

  // troca de amostra ou de equipamento invalida o que estava na bancada
  useEffect(() => {
    void pararLeitura();
    setTrace([]);
    setReplicas([]);
  }, [ensaioId, equipamentoId, pararLeitura]);

  const iniciarLeitura = useCallback(async () => {
    if (!calibracao || !item || !equipamento) return;
    setErroFonte(undefined);
    setTrace([]);
    inicioRef.current = Date.now();

    const paraMv = (ph: number, t: number) => mvDePh(ph, t, calibracao);

    const fonte: FontePh = modo === 'instrumento'
      ? new SerialPh(protocolo, equipamento.baudRate ?? 9600)
      : new SimuladorPh({
          phAlvo: phSimulado(item.amostra.id + item.parametro.id, item.parametro.extrator ?? 'H2O'),
          temperatura: 23.4 + Math.random() * 2.6,
          tau: 5 + Math.random() * 4,
          mvDePh: paraMv,
          intervaloMs: 420,
        });

    fonte.observarStatus((e, detalhe) => {
      if (e === 'erro' && detalhe) {
        setErroFonte(detalhe);
        setLendo(false);
      }
    });

    fonte.assinar((amostra) => {
      const t = (Date.now() - inicioRef.current) / 1000;
      const temperatura = amostra.temperatura;
      // o instrumento pode mandar pH, mV, ou os dois: completamos o que faltar
      const mV = amostra.mV ?? (amostra.ph !== undefined ? mvDePh(amostra.ph, temperatura, calibracao) : NaN);
      const ph = amostra.ph ?? phDeMv(mV, temperatura, calibracao);
      if (!Number.isFinite(ph)) return;
      setTrace((anterior) => [...anterior, { t, mV, ph, temperatura }].slice(-900));
    });

    try {
      await fonte.conectar();
      fonteRef.current = fonte;
      setLendo(true);
    } catch (e) {
      setErroFonte(e instanceof Error ? e.message : 'Não foi possível conectar ao instrumento.');
    }
  }, [calibracao, item, equipamento, modo, protocolo]);

  /* ---------- derivados ---------- */

  const estabilidade = useMemo(() => analisarEstabilidade(trace), [trace]);
  const ultimo = trace[trace.length - 1];

  const phCorrigido = useMemo(() => {
    if (!ultimo || !item) return NaN;
    return corrigirPara25C(ultimo.ph, ultimo.temperatura, item.parametro.extrator ?? 'H2O');
  }, [ultimo, item]);

  const estatReplicas = useMemo(() => analisarReplicas(replicas), [replicas]);

  // captura automática assim que o sinal estabiliza
  useEffect(() => {
    if (!lendo) { setCapturado(false); return; }
    if (estabilidade.estavel && !capturado && Number.isFinite(phCorrigido)) {
      setCapturado(true);
      setReplicas((r) => [...r, phCorrigido]);
      toast.success('Leitura estável capturada', {
        description: `pH ${numero(phCorrigido, 2)} · deriva ${numero(estabilidade.derivaMvPorMin, 2)} mV/min em ${duracao(estabilidade.tempoDecorridoS)}.`,
      });
    }
  }, [estabilidade, phCorrigido, lendo, capturado]);

  /* ---------- ações ---------- */

  const capturarManual = () => {
    const ph = Number(manualPh.replace(',', '.'));
    const t = Number(manualTemp.replace(',', '.'));
    if (!Number.isFinite(ph) || ph < 0 || ph > 14) {
      toast.error('pH inválido', { description: 'Informe um valor entre 0 e 14.' });
      return;
    }
    if (!Number.isFinite(t) || t < 0 || t > 60) {
      toast.error('Temperatura inválida', { description: 'Informe um valor entre 0 e 60 °C.' });
      return;
    }
    const corrigido = corrigirPara25C(ph, t, item?.parametro.extrator ?? 'H2O');
    setReplicas((r) => [...r, corrigido]);
    setManualPh('');
    toast.success('Réplica adicionada', { description: `pH ${numero(corrigido, 2)} normalizado para 25 °C.` });
  };

  const novaReplica = async () => {
    await pararLeitura();
    setTrace([]);
    setCapturado(false);
    await iniciarLeitura();
  };

  const salvar = async () => {
    if (!item || !calibracao || !equipamento) return;
    if (replicas.length === 0) {
      toast.error('Nenhuma réplica capturada.');
      return;
    }
    if (!estatReplicas.conforme) {
      toast.error('Réplicas discordantes', {
        description: `RSD de ${numero(estatReplicas.rsd, 2)}% acima do limite de ${CRITERIOS.rsdMaxPercentual}%. Repita a determinação.`,
      });
      return;
    }

    const valorFinal = estatReplicas.media;
    const leitura: LeituraPh = {
      id: `lph-${Date.now()}`,
      ensaioId: item.ensaio.id,
      amostraId: item.amostra.id,
      parametroId: item.parametro.id,
      equipamentoId: equipamento.id,
      calibracaoId: calibracao.id,
      analistaId: usuario.id,
      origem: modo === 'manual' ? 'manual' : 'instrumento',
      mV: ultimo?.mV ?? mvDePh(valorFinal, 25, calibracao),
      temperatura: ultimo?.temperatura ?? Number(manualTemp.replace(',', '.')),
      phBruto: ultimo?.ph ?? valorFinal,
      phCorrigido: valorFinal,
      derivaMvPorMin: Number.isFinite(estabilidade.derivaMvPorMin) ? estabilidade.derivaMvPorMin : 0,
      estavel: true,
      tempoEstabilizacaoS: estabilidade.tempoDecorridoS,
      extrator: (item.parametro.extrator ?? 'H2O') as LeituraPh['extrator'],
      proporcao: item.parametro.proporcao ?? '1:2,5',
      dataHora: new Date().toISOString(),
      trace: trace.length ? trace : undefined,
      observacao: replicas.length > 1 ? `Média de ${replicas.length} réplicas · RSD ${numero(estatReplicas.rsd, 2)}%` : undefined,
    };

    registrarLeitura(leitura, valorFinal);
    await pararLeitura();
    setTrace([]);
    setReplicas([]);

    toast.success(`Resultado gravado — ${item.amostra.protocolo}`, {
      description: `${item.parametro.nome}: pH ${numero(valorFinal, 2)} (${classificarPh(valorFinal, item.parametro.extrator ?? 'H2O').rotulo}).`,
    });

    const proximo = fila.find((f) => f.ensaio.id !== item.ensaio.id);
    setEnsaioId(proximo?.ensaio.id);
  };

  /* ---------- render ---------- */

  if (!pode('ph:criar')) {
    return (
      <Secao>
        <Vazio
          icone={AlertTriangle}
          titulo="Sem permissão para operar a bancada"
          descricao="Seu papel permite consultar as leituras, mas não registrar resultados. Fale com o responsável técnico."
        />
      </Secao>
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[19rem_minmax(0,1fr)]">
      {/* ---- Fila ---- */}
      <div className="space-y-5">
        <Secao titulo="Fila da bancada" descricao={`${fila.length} determinações de pH aguardando`} semPadding>
          <ScrollArea className="h-[20rem] xl:h-[27rem]">
            {fila.length === 0 ? (
              <Vazio icone={CheckCircle2} titulo="Fila vazia" descricao="Todas as determinações de pH foram lidas." />
            ) : (
              <ul className="divide-y divide-[hsl(var(--line-soft))]">
                {fila.slice(0, 60).map((f) => {
                  const ativo = f.ensaio.id === item?.ensaio.id;
                  return (
                    <li key={f.ensaio.id}>
                      <button
                        type="button"
                        onClick={() => setEnsaioId(f.ensaio.id)}
                        className={cn(
                          'relative w-full px-4 py-3 text-left transition-colors',
                          ativo ? 'bg-[hsl(var(--surface-raised))]' : 'hover:bg-[hsl(var(--surface-raised)/0.6)]',
                        )}
                      >
                        {ativo && <span className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-primary" aria-hidden />}
                        <div className="flex items-center justify-between gap-2">
                          <span className="num text-xs font-medium text-foreground">{f.amostra.protocolo}</span>
                          {f.amostra.prioridade !== 'normal' && (
                            <Pilula tom={f.amostra.prioridade === 'emergencial' ? 'erro' : 'alerta'} className="px-1.5 py-0 text-[0.62rem]">
                              {f.amostra.prioridade}
                            </Pilula>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{f.parametro.nome}</p>
                        <p className="mt-0.5 truncate text-[0.68rem] text-muted-foreground/70">
                          {f.amostra.identificacaoCampo}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </ScrollArea>
        </Secao>

        {item && (
          <Secao titulo="Amostra em bancada">
            <dl className="space-y-3 text-sm">
              <Par rotulo="Protocolo" valor={<span className="num">{item.amostra.protocolo}</span>} />
              <Par rotulo="Determinação" valor={item.parametro.nome} />
              <Par rotulo="Método" valor={<span className="text-xs leading-snug">{item.parametro.metodo}</span>} />
              <Par rotulo="Extrator" valor={`${item.parametro.extrator === 'CaCl2' ? 'CaCl₂ 0,01 mol/L' : item.parametro.extrator === 'SMP' ? 'Tampão SMP' : item.parametro.extrator === 'KCl' ? 'KCl 1 mol/L' : item.parametro.extrator === 'direto' ? 'Leitura direta' : 'Água'} · ${item.parametro.proporcao}`} />
              <Par rotulo="Posição" valor={<span className="num">{item.amostra.posicaoBandeja}</span>} />
              <Par rotulo="Prazo" valor={tempoRelativo(item.amostra.prazoEntrega)} />
            </dl>
          </Secao>
        )}
      </div>

      {/* ---- Estação ---- */}
      <div className="space-y-5">
        {/* Instrumento e calibração */}
        <Secao
          titulo="Instrumento"
          acoes={
            calibracao && (
              <Pilula tom={calibracaoOk ? 'sucesso' : 'erro'} pontinho>
                {calibracaoOk ? 'Calibração válida' : calibracao.status === 'reprovada' ? 'Calibração reprovada' : 'Calibração vencida'}
              </Pilula>
            )
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="label-micro mb-2 block">pHmetro</Label>
              <Select value={equipamentoId} onValueChange={setEquipamentoId}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {phmetros.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      <span className="num mr-2 text-xs text-muted-foreground">{e.tag}</span>
                      {e.fabricante} {e.modelo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="label-micro mb-2 block">Modo de aquisição</Label>
              <Select value={modo} onValueChange={(v) => setModo(v as Modo)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="simulador">
                    <span className="flex items-center gap-2"><Cpu className="h-3.5 w-3.5" /> Bancada virtual</span>
                  </SelectItem>
                  <SelectItem value="instrumento" disabled={!serialDisponivel()}>
                    <span className="flex items-center gap-2">
                      <Usb className="h-3.5 w-3.5" /> Instrumento via USB/serial
                      {!serialDisponivel() && <span className="text-[0.65rem] text-muted-foreground">(indisponível)</span>}
                    </span>
                  </SelectItem>
                  <SelectItem value="manual">
                    <span className="flex items-center gap-2"><Hand className="h-3.5 w-3.5" /> Digitação manual</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {modo === 'instrumento' && (
            <div className="mt-4">
              <Label className="label-micro mb-2 block">Protocolo do fabricante</Label>
              <Select value={protocolo} onValueChange={(v) => setProtocolo(v as Protocolo)}>
                <SelectTrigger className="h-9 sm:w-80"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['generico-ascii', 'mettler', 'hanna', 'digimed', 'tecnal'] as Protocolo[]).map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-2 text-xs text-muted-foreground">
                A Web Serial API só funciona em Chrome ou Edge servidos por HTTPS, e pede autorização
                da porta a cada sessão.
              </p>
            </div>
          )}

          {calibracao && (
            <div className="panel-sunken mt-4 grid grid-cols-2 gap-x-4 gap-y-3 p-4 sm:grid-cols-4">
              <Metrica rotulo="Slope" valor={`${numero(calibracao.slopePercentual, 1)}%`}
                alerta={calibracao.slopePercentual < CRITERIOS.slopeMin || calibracao.slopePercentual > CRITERIOS.slopeMax} />
              <Metrica rotulo="Offset" valor={`${numero(calibracao.offsetMv, 1)} mV`}
                alerta={Math.abs(calibracao.offsetMv) > CRITERIOS.offsetMaxMv} />
              <Metrica rotulo="Linearidade" valor={`R² ${calibracao.r2.toFixed(4)}`} />
              <Metrica rotulo="Calibrado" valor={tempoRelativo(calibracao.data)} />
            </div>
          )}

          {!calibracaoOk && (
            <div className="mt-4 flex items-start gap-2.5 rounded-[var(--radius-sm)] border border-destructive/30 bg-destructive/10 px-3.5 py-3">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <p className="text-xs leading-relaxed text-destructive">
                Este pHmetro está sem calibração válida. Calibre o eletrodo na aba
                <strong> Calibração </strong> antes de registrar resultados — leituras feitas fora de
                calibração não têm rastreabilidade metrológica.
              </p>
            </div>
          )}

          {erroFonte && (
            <div className="mt-4 flex items-start gap-2.5 rounded-[var(--radius-sm)] border border-[hsl(var(--warning)/0.3)] bg-[hsl(var(--warning)/0.1)] px-3.5 py-3">
              <Plug className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--warning))]" />
              <p className="text-xs leading-relaxed text-[hsl(var(--warning))]">{erroFonte}</p>
            </div>
          )}
        </Secao>

        {/* Mostrador */}
        {modo === 'manual' ? (
          <Secao titulo="Entrada manual" descricao="Use quando o instrumento não tem saída de dados.">
            <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <div>
                <Label className="label-micro mb-2 block" htmlFor="ph-manual">pH lido</Label>
                <Input
                  id="ph-manual" inputMode="decimal" value={manualPh}
                  onChange={(e) => setManualPh(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') capturarManual(); }}
                  placeholder="5,42" className="num h-10 text-lg"
                />
              </div>
              <div>
                <Label className="label-micro mb-2 block" htmlFor="temp-manual">Temperatura (°C)</Label>
                <Input
                  id="temp-manual" inputMode="decimal" value={manualTemp}
                  onChange={(e) => setManualTemp(e.target.value)}
                  className="num h-10 text-lg"
                />
              </div>
              <Button onClick={capturarManual} className="h-10" disabled={!calibracaoOk}>
                Adicionar réplica
              </Button>
            </div>
            {manualPh && Number.isFinite(Number(manualPh.replace(',', '.'))) && (
              <div className="mt-5">
                <ReguaPh
                  valor={Number(manualPh.replace(',', '.'))}
                  extrator={item?.parametro.extrator ?? 'H2O'}
                />
              </div>
            )}
          </Secao>
        ) : (
          <>
            <MostradorPh
              ph={phCorrigido}
              mV={ultimo?.mV ?? NaN}
              temperatura={ultimo?.temperatura ?? NaN}
              estavel={estabilidade.estavel || capturado}
              lendo={lendo}
              derivaMvPorMin={estabilidade.derivaMvPorMin}
              tempoS={estabilidade.tempoDecorridoS}
            />

            <Secao
              titulo="Curva de estabilização"
              descricao={`Critério: deriva ≤ ${CRITERIOS.derivaMaxMvPorMin} mV/min por ${CRITERIOS.janelaEstabilidadeS} s`}
              acoes={
                <button
                  type="button"
                  onClick={() => setVerMv((v) => !v)}
                  className="label-micro transition-colors hover:text-foreground"
                >
                  {verMv ? 'ver pH' : 'ver mV'}
                </button>
              }
            >
              <GraficoTrace trace={trace} mostrarMv={verMv} altura={190} />
            </Secao>
          </>
        )}

        {/* Controles */}
        <div className="flex flex-wrap items-center gap-2">
          {modo !== 'manual' && (
            lendo ? (
              <Button onClick={pararLeitura} variant="secondary" className="gap-2">
                <CircleStop className="h-4 w-4" /> Parar leitura
              </Button>
            ) : (
              <Button onClick={iniciarLeitura} disabled={!item || !calibracaoOk} className="gap-2">
                <Play className="h-4 w-4" />
                {modo === 'instrumento' ? 'Conectar e ler' : 'Iniciar leitura'}
              </Button>
            )
          )}
          {modo !== 'manual' && lendo && (
            <Button onClick={novaReplica} variant="outline" className="gap-2">
              <RotateCcw className="h-4 w-4" /> Nova réplica
            </Button>
          )}
          <Button
            onClick={salvar}
            disabled={replicas.length === 0 || !calibracaoOk}
            className="gap-2"
            variant={replicas.length > 0 && estatReplicas.conforme ? 'default' : 'secondary'}
          >
            <Save className="h-4 w-4" /> Gravar resultado
          </Button>
        </div>

        {/* Réplicas */}
        <Secao
          titulo="Réplicas"
          descricao={`Limite de RSD entre réplicas: ${CRITERIOS.rsdMaxPercentual}%`}
          acoes={replicas.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setReplicas([])} className="h-7 gap-1.5 text-xs">
              <Trash2 className="h-3.5 w-3.5" /> limpar
            </Button>
          )}
        >
          {replicas.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              Nenhuma réplica capturada. A captura é automática quando o sinal estabiliza.
            </p>
          ) : (
            <div className="space-y-4">
              <ul className="flex flex-wrap gap-2">
                {replicas.map((r, i) => (
                  <li
                    key={`${r}-${i}`}
                    className="panel-sunken flex items-center gap-2.5 px-3 py-2"
                  >
                    <span className="label-micro">#{i + 1}</span>
                    <span className="num text-sm font-medium text-foreground">{numero(r, 2)}</span>
                    <button
                      type="button"
                      aria-label={`Remover réplica ${i + 1}`}
                      onClick={() => setReplicas((lista) => lista.filter((_, k) => k !== i))}
                      className="text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>

              <div className="panel-sunken grid grid-cols-2 gap-x-4 gap-y-3 p-4 sm:grid-cols-4">
                <Metrica rotulo="Média" valor={numero(estatReplicas.media, 2)} />
                <Metrica rotulo="Desvio padrão" valor={numero(estatReplicas.desvioPadrao, 3)} />
                <Metrica
                  rotulo="RSD"
                  valor={`${numero(estatReplicas.rsd, 2)}%`}
                  alerta={!estatReplicas.conforme}
                />
                <Metrica rotulo="Amplitude" valor={numero(estatReplicas.amplitude, 3)} />
              </div>

              {!estatReplicas.conforme && (
                <div className="flex items-start gap-2.5 rounded-[var(--radius-sm)] border border-destructive/30 bg-destructive/10 px-3.5 py-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  <p className="text-xs leading-relaxed text-destructive">
                    Réplicas discordantes. Verifique homogeneização da suspensão, tempo de repouso e
                    limpeza do bulbo antes de repetir.
                  </p>
                </div>
              )}

              {estatReplicas.conforme && item && (
                <div className="rounded-[var(--radius-sm)] border border-[hsl(var(--line-soft))] bg-[hsl(var(--surface-sunken))] p-4">
                  <p className="label-micro mb-3">Resultado a gravar</p>
                  <ReguaPh valor={estatReplicas.media} extrator={item.parametro.extrator ?? 'H2O'} />
                </div>
              )}
            </div>
          )}
        </Secao>
      </div>
    </div>
  );
}

/* ---------------- auxiliares ---------------- */

function Par({ rotulo, valor }: { rotulo: string; valor: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="label-micro shrink-0 pt-0.5">{rotulo}</dt>
      <dd className="min-w-0 text-right text-sm text-foreground">{valor}</dd>
    </div>
  );
}

function Metrica({ rotulo, valor, alerta }: { rotulo: string; valor: string; alerta?: boolean }) {
  return (
    <div>
      <p className="label-micro mb-1">{rotulo}</p>
      <p className={cn('num text-sm font-medium', alerta ? 'text-destructive' : 'text-foreground')}>
        {valor}
      </p>
    </div>
  );
}

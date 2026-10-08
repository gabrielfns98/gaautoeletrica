/* ============================================================
   BANCADA — aquisição de sinal do potenciômetro
   Duas fontes intercambiáveis:
     • SerialPh      — pHmetro físico via Web Serial API (USB/RS-232)
     • SimuladorPh   — bancada virtual, para treino e demonstração
   ============================================================ */

/* ---------------- Tipagem mínima da Web Serial API ---------------- */
/* Ainda não faz parte do lib.dom padrão do TypeScript. */

interface SerialPortLike {
  open(options: { baudRate: number; dataBits?: number; stopBits?: number; parity?: string }): Promise<void>;
  close(): Promise<void>;
  readable: ReadableStream<Uint8Array> | null;
  getInfo?(): { usbVendorId?: number; usbProductId?: number };
}

interface SerialLike {
  requestPort(options?: { filters?: Array<{ usbVendorId: number }> }): Promise<SerialPortLike>;
  getPorts(): Promise<SerialPortLike[]>;
}

function obterSerial(): SerialLike | undefined {
  return (navigator as Navigator & { serial?: SerialLike }).serial;
}

export function serialDisponivel(): boolean {
  return typeof navigator !== 'undefined' && obterSerial() !== undefined;
}

/* ---------------- Contrato comum ---------------- */

export interface AmostraInstrumento {
  /** potencial em mV, quando o instrumento reporta */
  mV?: number;
  /** pH já calculado pelo instrumento, quando reportado */
  ph?: number;
  temperatura: number;
  /** o instrumento sinalizou leitura estável */
  estavelNoInstrumento?: boolean;
  bruto?: string;
}

export type OuvinteInstrumento = (amostra: AmostraInstrumento) => void;
export type OuvinteStatus = (estado: EstadoFonte, detalhe?: string) => void;

export type EstadoFonte = 'desconectado' | 'conectando' | 'conectado' | 'erro';

export interface FontePh {
  readonly tipo: 'serial' | 'simulador';
  readonly descricao: string;
  readonly estado: EstadoFonte;
  conectar(): Promise<void>;
  desconectar(): Promise<void>;
  assinar(ouvinte: OuvinteInstrumento): () => void;
  observarStatus(ouvinte: OuvinteStatus): () => void;
}

/* ---------------- Parsers por fabricante ---------------- */

export type Protocolo = 'generico-ascii' | 'mettler' | 'hanna' | 'digimed' | 'tecnal';

export const PROTOCOLOS: Array<{ id: Protocolo; nome: string; exemplo: string; baudPadrao: number }> = [
  { id: 'generico-ascii', nome: 'Genérico ASCII',  exemplo: '5.42 pH 25.3 C',           baudPadrao: 9600 },
  { id: 'mettler',        nome: 'Mettler Toledo',  exemplo: '  5.42 pH   25.3 °C   A',  baudPadrao: 9600 },
  { id: 'hanna',          nome: 'Hanna Instruments', exemplo: '5.42 pH 25.3°C ATC',     baudPadrao: 9600 },
  { id: 'digimed',        nome: 'Digimed',         exemplo: 'pH = 5.42  T = 25.3',      baudPadrao: 4800 },
  { id: 'tecnal',         nome: 'Tecnal',          exemplo: '5.42;25.3;-4.3',           baudPadrao: 9600 },
];

const num = (s: string | undefined): number | undefined => {
  if (s === undefined) return undefined;
  const v = Number(s.replace(',', '.'));
  return Number.isFinite(v) ? v : undefined;
};

/**
 * Converte uma linha do instrumento em amostra.
 * Os parsers são tolerantes: se o formato específico não casar,
 * cai no extrator genérico de pares valor+unidade.
 */
export function interpretarLinha(linha: string, protocolo: Protocolo = 'generico-ascii'): AmostraInstrumento | null {
  const texto = linha.trim();
  if (!texto) return null;

  if (protocolo === 'tecnal') {
    const campos = texto.split(/[;,]/).map((c) => c.trim());
    if (campos.length >= 2) {
      const ph = num(campos[0]);
      const temperatura = num(campos[1]);
      if (ph !== undefined && temperatura !== undefined) {
        return { ph, temperatura, mV: num(campos[2]), bruto: texto };
      }
    }
  }

  if (protocolo === 'digimed') {
    const mPh = /pH\s*=\s*(-?[\d.,]+)/i.exec(texto);
    const mT = /T\s*=\s*(-?[\d.,]+)/i.exec(texto);
    const mMv = /(-?[\d.,]+)\s*mV/i.exec(texto);
    if (mPh || mMv) {
      return { ph: num(mPh?.[1]), mV: num(mMv?.[1]), temperatura: num(mT?.[1]) ?? 25, bruto: texto };
    }
  }

  // Genérico / Mettler / Hanna: procura "<valor> pH", "<valor> mV" e "<valor> °C"
  const mMv = /(-?[\d.,]+)\s*mV\b/i.exec(texto);
  const mPh = /(-?[\d.,]+)\s*pH\b/i.exec(texto);
  const mT = /(-?[\d.,]+)\s*°?\s*C\b/i.exec(texto);

  if (mPh || mMv) {
    return {
      ph: num(mPh?.[1]),
      mV: num(mMv?.[1]),
      temperatura: num(mT?.[1]) ?? 25,
      // Mettler marca leitura estável com "A" (auto-endpoint); Hanna com "STABLE"
      estavelNoInstrumento: /\bA\s*$/.test(texto) || /stable/i.test(texto),
      bruto: texto,
    };
  }

  // Último recurso: duas ou três colunas numéricas soltas
  const numeros = texto.split(/[\s;,\t]+/).map(num).filter((v): v is number => v !== undefined);
  if (numeros.length >= 2) {
    return { ph: numeros[0], temperatura: numeros[1], mV: numeros[2], bruto: texto };
  }
  return null;
}

/* ---------------- Fonte real: Web Serial ---------------- */

export class SerialPh implements FontePh {
  readonly tipo = 'serial' as const;
  estado: EstadoFonte = 'desconectado';

  private porta?: SerialPortLike;
  private leitor?: ReadableStreamDefaultReader<Uint8Array>;
  private ouvintes = new Set<OuvinteInstrumento>();
  private statusOuvintes = new Set<OuvinteStatus>();
  private parar = false;
  private buffer = '';

  constructor(
    private readonly protocolo: Protocolo = 'generico-ascii',
    private readonly baudRate = 9600,
  ) {}

  get descricao(): string {
    const p = PROTOCOLOS.find((x) => x.id === this.protocolo);
    return `${p?.nome ?? this.protocolo} · ${this.baudRate} baud`;
  }

  private emitirStatus(estado: EstadoFonte, detalhe?: string) {
    this.estado = estado;
    this.statusOuvintes.forEach((o) => o(estado, detalhe));
  }

  async conectar(): Promise<void> {
    const serial = obterSerial();
    if (!serial) {
      this.emitirStatus('erro', 'Web Serial indisponível neste navegador. Use Chrome ou Edge em HTTPS.');
      throw new Error('Web Serial indisponível');
    }
    this.emitirStatus('conectando');
    try {
      this.porta = await serial.requestPort();
      await this.porta.open({ baudRate: this.baudRate, dataBits: 8, stopBits: 1, parity: 'none' });
      this.parar = false;
      this.emitirStatus('conectado');
      void this.bombear();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha ao abrir a porta';
      this.emitirStatus('erro', msg);
      throw e;
    }
  }

  private async bombear(): Promise<void> {
    if (!this.porta?.readable) return;
    const decoder = new TextDecoder();
    this.leitor = this.porta.readable.getReader();
    try {
      while (!this.parar) {
        const { value, done } = await this.leitor.read();
        if (done) break;
        this.buffer += decoder.decode(value, { stream: true });
        const linhas = this.buffer.split(/\r?\n/);
        this.buffer = linhas.pop() ?? '';
        for (const linha of linhas) {
          const amostra = interpretarLinha(linha, this.protocolo);
          if (amostra) this.ouvintes.forEach((o) => o(amostra));
        }
      }
    } catch (e) {
      if (!this.parar) {
        this.emitirStatus('erro', e instanceof Error ? e.message : 'Leitura interrompida');
      }
    } finally {
      try { this.leitor?.releaseLock(); } catch { /* porta já liberada */ }
      this.leitor = undefined;
    }
  }

  async desconectar(): Promise<void> {
    this.parar = true;
    try { await this.leitor?.cancel(); } catch { /* ignora */ }
    try { await this.porta?.close(); } catch { /* ignora */ }
    this.porta = undefined;
    this.buffer = '';
    this.emitirStatus('desconectado');
  }

  assinar(ouvinte: OuvinteInstrumento): () => void {
    this.ouvintes.add(ouvinte);
    return () => this.ouvintes.delete(ouvinte);
  }

  observarStatus(ouvinte: OuvinteStatus): () => void {
    this.statusOuvintes.add(ouvinte);
    ouvinte(this.estado);
    return () => this.statusOuvintes.delete(ouvinte);
  }
}

/* ---------------- Fonte simulada: bancada virtual ---------------- */

export interface OpcoesSimulador {
  /** pH verdadeiro da amostra */
  phAlvo: number;
  /** temperatura da suspensão, em °C */
  temperatura?: number;
  /** constante de tempo da resposta do eletrodo, em segundos */
  tau?: number;
  /** ruído de pico, em mV */
  ruidoMv?: number;
  /** potencial inicial, simulando arraste da amostra anterior */
  mvInicial?: number;
  /** intervalo de amostragem, em ms */
  intervaloMs?: number;
  /** converte pH em mV usando a calibração vigente */
  mvDePh: (ph: number, temperatura: number) => number;
}

/**
 * Reproduz a resposta de um eletrodo de vidro: aproximação exponencial
 * do equilíbrio, com ruído branco e uma deriva lenta residual.
 *
 *   E(t) = E∞ + (E₀ − E∞)·e^(−t/τ) + ruído + deriva·t
 */
export class SimuladorPh implements FontePh {
  readonly tipo = 'simulador' as const;
  readonly descricao = 'Bancada virtual · eletrodo simulado';
  estado: EstadoFonte = 'desconectado';

  private timer?: ReturnType<typeof setInterval>;
  private ouvintes = new Set<OuvinteInstrumento>();
  private statusOuvintes = new Set<OuvinteStatus>();
  private t0 = 0;
  private derivaMvPorS: number;

  constructor(private opcoes: OpcoesSimulador) {
    this.derivaMvPorS = (Math.random() - 0.5) * 0.02;
  }

  /** Troca a amostra sem reabrir a conexão — como mergulhar o eletrodo noutro béquer. */
  reconfigurar(parcial: Partial<OpcoesSimulador>): void {
    this.opcoes = { ...this.opcoes, ...parcial };
    this.t0 = Date.now();
    this.derivaMvPorS = (Math.random() - 0.5) * 0.02;
  }

  private emitirStatus(estado: EstadoFonte, detalhe?: string) {
    this.estado = estado;
    this.statusOuvintes.forEach((o) => o(estado, detalhe));
  }

  async conectar(): Promise<void> {
    this.emitirStatus('conectando');
    await new Promise((r) => setTimeout(r, 400));
    this.t0 = Date.now();
    const intervalo = this.opcoes.intervaloMs ?? 500;

    this.timer = setInterval(() => {
      const {
        phAlvo, temperatura = 24.6, tau = 6, ruidoMv = 0.25, mvDePh,
      } = this.opcoes;

      const t = (Date.now() - this.t0) / 1000;
      const tempAtual = temperatura + Math.sin(t / 18) * 0.08;
      const eFinal = mvDePh(phAlvo, tempAtual);
      const eInicial = this.opcoes.mvInicial ?? eFinal + 42;

      const ruido = (Math.random() - 0.5) * 2 * ruidoMv;
      const mV = eFinal + (eInicial - eFinal) * Math.exp(-t / tau) + ruido + this.derivaMvPorS * t;

      this.ouvintes.forEach((o) => o({ mV, temperatura: tempAtual }));
    }, intervalo);

    this.emitirStatus('conectado');
  }

  async desconectar(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    this.emitirStatus('desconectado');
  }

  assinar(ouvinte: OuvinteInstrumento): () => void {
    this.ouvintes.add(ouvinte);
    return () => this.ouvintes.delete(ouvinte);
  }

  observarStatus(ouvinte: OuvinteStatus): () => void {
    this.statusOuvintes.add(ouvinte);
    ouvinte(this.estado);
    return () => this.statusOuvintes.delete(ouvinte);
  }
}

/* ---------------- Importação de arquivo do instrumento ---------------- */

export interface LinhaImportada {
  linha: number;
  identificacao: string;
  ph?: number;
  mV?: number;
  temperatura?: number;
  erro?: string;
}

/**
 * Lê um export de pHmetro em CSV/TSV. Aceita cabeçalho em português
 * ou inglês e separador vírgula, ponto-e-vírgula ou tabulação.
 */
export function importarCsv(conteudo: string): LinhaImportada[] {
  const linhas = conteudo.split(/\r?\n/).filter((l) => l.trim());
  if (linhas.length === 0) return [];

  const sep = [';', '\t', ','].reduce((melhor, s) =>
    linhas[0].split(s).length > linhas[0].split(melhor).length ? s : melhor, ',');

  const cabecalho = linhas[0].split(sep).map((c) => c.trim().toLowerCase());
  const temCabecalho = cabecalho.some((c) => /amostra|sample|id|protocolo|ph|temp/.test(c));

  const col = (...nomes: string[]) =>
    cabecalho.findIndex((c) => nomes.some((n) => c.includes(n)));

  const iId = temCabecalho ? col('protocolo', 'amostra', 'sample', 'id') : 0;
  const iPh = temCabecalho ? col('ph') : 1;
  const iT = temCabecalho ? col('temp', '°c') : 2;
  const iMv = temCabecalho ? col('mv') : -1;

  const corpo = temCabecalho ? linhas.slice(1) : linhas;

  return corpo.map((linha, idx) => {
    const campos = linha.split(sep).map((c) => c.trim());
    const identificacao = campos[iId >= 0 ? iId : 0] ?? '';
    const ph = num(campos[iPh]);
    const temperatura = num(campos[iT]);
    const mV = iMv >= 0 ? num(campos[iMv]) : undefined;

    let erro: string | undefined;
    if (!identificacao) erro = 'Identificação da amostra ausente';
    else if (ph === undefined && mV === undefined) erro = 'Nem pH nem mV reconhecidos';
    else if (ph !== undefined && (ph < 0 || ph > 14)) erro = `pH ${ph} fora da faixa 0–14`;

    return { linha: idx + (temCabecalho ? 2 : 1), identificacao, ph, mV, temperatura, erro };
  });
}

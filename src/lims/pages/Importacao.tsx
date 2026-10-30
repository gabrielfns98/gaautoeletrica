/* ============================================================
   BANCADA — importação de planilha
   O caminho principal de entrada: amostras e resultados chegam
   em arquivo ou colados do Excel, não digitados um a um.
   ============================================================ */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2, ClipboardPaste, Download, FileUp, Columns3, History,
  TriangleAlert, Upload, XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { useAcoes, useBancada, useIndices } from '../data/store';
import {
  ALVOS_AMOSTRA, hashDoConteudo, lerData, lerNumero, lerTabela, resumir, sugerirMapeamento,
} from '../lib/importacao';
import { lerXlsx, matrizParaTexto } from '../lib/xlsx';
import type { LinhaValidada, SituacaoLinha, TabelaLida } from '../lib/importacao';
import { dataHora, numero } from '../lib/format';
import { CabecalhoPagina, Indicador, Pilula, Secao, Segmentos, Vazio } from '../components/primitivos';
import type { TomStatus } from '../components/primitivos';
import type { Amostra, Ensaio, Importacao as RegistroImportacao, LoteRecepcao, Parametro } from '../types';

type Fluxo = 'amostras' | 'resultados';

const TOM: Record<SituacaoLinha, TomStatus> = { pronta: 'sucesso', alerta: 'alerta', erro: 'erro' };

const EXEMPLO_AMOSTRAS = `Identificação;Propriedade;Talhão;Profundidade;Cultura;Data de coleta
Ponto 01;Serra Azul;T-01;0-20 cm;Soja;12/10/2026
Ponto 02;Serra Azul;T-01;20-40 cm;Soja;12/10/2026
Ponto 03;Serra Azul;T-02;0-20 cm;Milho 2ª safra;12/10/2026`;

const EXEMPLO_RESULTADOS = `Protocolo;PH-H2O;PH-CACL2;MO;P-MEL;K
26.014532;5,42;4,88;24,1;18,3;72
26.014533;4,87;4,31;19,6;9,4;41
26.014534;6,13;5,52;31,8;42,7;118`;

export default function Importacao() {
  const [fluxo, setFluxo] = useState<Fluxo>('resultados');
  const { pode } = useBancada();

  if (!pode('amostras:criar') && !pode('analises:editar')) {
    return (
      <>
        <CabecalhoPagina eyebrow="Entrada" titulo="Importação" />
        <Secao><Vazio icone={XCircle} titulo="Sem permissão para importar" /></Secao>
      </>
    );
  }

  return (
    <>
      <CabecalhoPagina
        eyebrow="Entrada"
        titulo="Importação"
        descricao="Suba o arquivo ou cole direto da planilha. O sistema detecta o separador, o decimal e sugere para onde vai cada coluna — você confere antes de gravar."
      >
        <div className="mt-6">
          <Segmentos
            valor={fluxo}
            aoMudar={setFluxo}
            opcoes={[
              { valor: 'resultados' as const, rotulo: 'Resultados' },
              { valor: 'amostras' as const, rotulo: 'Amostras' },
            ]}
          />
        </div>
      </CabecalhoPagina>

      {fluxo === 'resultados' ? <ImportarResultados /> : <ImportarAmostras />}

      <Importacoes />
    </>
  );
}

/**
 * O hash do conteúdo é assíncrono e o texto muda a cada tecla, então ele
 * chega sempre um instante depois — e vazio enquanto não há conteúdo.
 */
function useHashDoConteudo(conteudo: string): string {
  const [hash, setHash] = useState('');

  useEffect(() => {
    const texto = conteudo.trim();
    if (!texto) { setHash(''); return; }
    let vivo = true;
    void hashDoConteudo(texto)
      .then((h) => { if (vivo) setHash(h); })
      .catch(() => { if (vivo) setHash(''); });
    return () => { vivo = false; };
  }, [conteudo]);

  return hash;
}

/** Mesmo conteúdo subindo de novo: avisa, mas não impede. */
function AvisoRepetido({ importacao }: { importacao: RegistroImportacao }) {
  const { estado } = useBancada();
  const quem = estado.usuarios.find((u) => u.id === importacao.usuarioId)?.nome ?? 'outro operador';

  return (
    <Secao className="border-[hsl(var(--warning)/0.45)]">
      <div className="flex items-start gap-3">
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--warning))]" />
        <div>
          <p className="text-sm font-medium text-foreground">Esta planilha já entrou antes</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {dataHora(importacao.data)}, por {quem} — {importacao.linhas}{' '}
            {importacao.linhas === 1 ? 'linha lida' : 'linhas lidas'}, {importacao.gravados} gravados
            {importacao.arquivo ? ` (${importacao.arquivo})` : ''}. O conteúdo é idêntico, byte a byte.
            Importar de novo grava por cima do que ainda não foi aprovado e fica registrado como reimportação.
          </p>
        </div>
      </div>
    </Secao>
  );
}

/** A trilha que responde de onde veio um resultado. */
function Importacoes() {
  const { estado } = useBancada();
  const recentes = estado.importacoes.slice(0, 8);
  if (recentes.length === 0) return null;

  return (
    <Secao
      className="mt-5"
      titulo="Importações recentes"
      descricao="Cada arquivo que entrou, com o que foi gravado por ele."
    >
      <ul className="divide-y divide-[hsl(var(--line-soft))]">
        {recentes.map((i) => {
          const quem = estado.usuarios.find((u) => u.id === i.usuarioId)?.nome ?? '—';
          return (
            <li key={i.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5 text-xs">
              <History className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
              <span className="num shrink-0 text-muted-foreground">{dataHora(i.data)}</span>
              <span className="min-w-0 flex-1 truncate text-foreground">{i.arquivo}</span>
              <Pilula tom={i.fluxo === 'resultados' ? 'info' : 'neutro'}>{i.fluxo}</Pilula>
              {i.reimportacao && <Pilula tom="alerta">reimportação</Pilula>}
              <span className="num shrink-0 text-muted-foreground">
                {i.gravados}/{i.linhas}
              </span>
              <span className="shrink-0 truncate text-muted-foreground">{quem}</span>
            </li>
          );
        })}
      </ul>
    </Secao>
  );
}

/* ============================================================
   Entrada do arquivo — comum aos dois fluxos
   ============================================================ */

function Entrada({
  conteudo, aoMudar, exemplo, tabela,
}: {
  conteudo: string;
  aoMudar: (v: string, arquivo?: string) => void;
  exemplo: string;
  tabela: TabelaLida | null;
}) {
  const inputArquivo = useRef<HTMLInputElement>(null);

  const carregar = async (arquivo: File) => {
    // .xls antigo é binário de outra era e não entra aqui.
    if (/\.xls$/i.test(arquivo.name)) {
      toast.error('Formato .xls antigo não é lido', {
        description: 'Abra no Excel e salve como .xlsx ou CSV.',
      });
      return;
    }

    if (/\.xls[xm]$/i.test(arquivo.name)) {
      try {
        const planilha = lerXlsx(new Uint8Array(await arquivo.arrayBuffer()));
        aoMudar(matrizParaTexto(planilha.matriz), arquivo.name);
        toast.success(`${arquivo.name} carregado`, {
          description: `Aba ${planilha.aba} · ${planilha.matriz.length} ${planilha.matriz.length === 1 ? 'linha' : 'linhas'}`,
        });
      } catch (e) {
        toast.error('Não consegui ler a planilha', {
          description: e instanceof Error ? e.message : String(e),
        });
      }
      return;
    }

    const texto = await arquivo.text();
    aoMudar(texto, arquivo.name);
    toast.info(`${arquivo.name} carregado`);
  };

  return (
    <Secao
      titulo="Arquivo"
      descricao="Excel (.xlsx), CSV, TSV ou colado da planilha (Ctrl+C lá, Ctrl+V aqui)."
      acoes={
        <>
          <input
            ref={inputArquivo} type="file" accept=".xlsx,.xlsm,.csv,.tsv,.txt" className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              // Limpar o campo é o que faz escolher o mesmo arquivo de novo
              // disparar evento: sem isso, a segunda tentativa não acontece.
              e.target.value = '';
              if (f) void carregar(f);
            }}
          />
          <Button variant="outline" size="sm" onClick={() => inputArquivo.current?.click()} className="h-8 gap-1.5 text-xs">
            <FileUp className="h-3.5 w-3.5" /> Escolher arquivo
          </Button>
          <Button variant="ghost" size="sm" onClick={() => aoMudar(exemplo)} className="h-8 gap-1.5 text-xs">
            <ClipboardPaste className="h-3.5 w-3.5" /> usar exemplo
          </Button>
        </>
      }
    >
      <Textarea
        value={conteudo}
        onChange={(e) => aoMudar(e.target.value)}
        placeholder={exemplo}
        rows={7}
        aria-label="Conteúdo da planilha"
        className="num resize-y bg-[hsl(var(--surface-sunken))] text-xs leading-relaxed"
      />
      {tabela && tabela.linhas.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[0.68rem] text-muted-foreground">
          <span>separador <span className="num text-foreground">{tabela.separador === '\t' ? 'tabulação' : tabela.separador}</span></span>
          <span>decimal <span className="num text-foreground">{tabela.decimalVirgula ? 'vírgula' : 'ponto'}</span></span>
          <span>cabeçalho <span className="num text-foreground">{tabela.temCabecalho ? 'sim' : 'não'}</span></span>
          <span><span className="num text-foreground">{tabela.linhas.length}</span> linhas · <span className="num text-foreground">{tabela.colunas.length}</span> colunas</span>
        </div>
      )}
      {tabela?.avisos.map((a) => (
        <p key={a} className="mt-2 flex items-start gap-2 text-xs text-[hsl(var(--warning))]">
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {a}
        </p>
      ))}
    </Secao>
  );
}

function Resumo({ linhas }: { linhas: Array<LinhaValidada<unknown>> }) {
  const r = resumir(linhas);
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Indicador rotulo="Linhas lidas" valor={r.total} />
      <Indicador rotulo="Prontas" valor={r.prontas} destaque={r.prontas > 0} />
      <Indicador rotulo="Com alerta" valor={r.alertas} detalhe="importa mesmo assim" />
      <Indicador rotulo="Com erro" valor={r.erros} detalhe="não serão importadas" destaque={r.erros > 0} />
    </div>
  );
}

/* ============================================================
   Fluxo 1 — resultados
   ============================================================ */

interface LinhaResultado {
  chave: string;
  protocolo?: string;
  valores: Array<{ parametro: Parametro; ensaio?: Ensaio; valor?: number; nota?: string }>;
}

function ImportarResultados() {
  const { estado, pode } = useBancada();
  const { lancarResultados, registrarImportacao } = useAcoes();
  const { parametroPorId, ensaiosPorAmostra } = useIndices();

  const [conteudo, setConteudo] = useState('');
  const [arquivo, setArquivo] = useState('');
  const [mapa, setMapa] = useState<Record<number, string> | null>(null);

  const tabela = useMemo(() => (conteudo.trim() ? lerTabela(conteudo) : null), [conteudo]);
  const hash = useHashDoConteudo(conteudo);
  const jaImportado = useMemo(
    () => estado.importacoes.find((i) => i.hash === hash && i.fluxo === 'resultados'),
    [estado.importacoes, hash],
  );

  /** Casa o título da coluna com o código ou o nome do elemento. */
  const sugestao = useMemo(() => {
    if (!tabela) return {};
    const normal = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const porChave = new Map<string, string>();
    for (const p of estado.parametros) {
      porChave.set(normal(p.codigo), p.id);
      porChave.set(normal(p.nome), p.id);
    }
    const m: Record<number, string> = {};
    for (const c of tabela.colunas) {
      const chave = normal(c.titulo);
      if (!chave) continue;
      if (/^(protocolo|codigodebarras|amostra|numero|namostra|id)$/.test(chave)) { m[c.indice] = 'chave'; continue; }
      const id = porChave.get(chave);
      if (id) m[c.indice] = id;
    }
    // sem coluna-chave reconhecida, a primeira serve
    if (!Object.values(m).includes('chave') && tabela.colunas.length > 0) m[tabela.colunas[0].indice] = 'chave';
    return m;
  }, [tabela, estado.parametros]);

  const mapeamento = mapa ?? sugestao;

  const linhas = useMemo<Array<LinhaValidada<LinhaResultado>>>(() => {
    if (!tabela) return [];
    const iChave = Number(Object.entries(mapeamento).find(([, v]) => v === 'chave')?.[0] ?? -1);
    const colunasElemento = Object.entries(mapeamento)
      .filter(([, v]) => v !== 'chave' && v !== 'ignorar')
      .map(([i, v]) => ({ indice: Number(i), parametro: parametroPorId.get(v) }))
      .filter((c): c is { indice: number; parametro: Parametro } => Boolean(c.parametro));

    return tabela.linhas.map((celulas, i) => {
      const numeroLinha = i + (tabela.temCabecalho ? 2 : 1);
      const chave = (celulas[iChave] ?? '').trim();

      if (!chave) {
        return { numero: numeroLinha, dados: { chave: '', valores: [] }, situacao: 'erro' as const,
                 mensagem: 'Sem identificação da amostra' };
      }
      if (colunasElemento.length === 0) {
        return { numero: numeroLinha, dados: { chave, valores: [] }, situacao: 'erro' as const,
                 mensagem: 'Nenhuma coluna mapeada para elemento' };
      }

      const soDigitos = chave.replace(/\D/g, '');
      const amostra = estado.amostras.find((a) =>
        a.protocolo === chave ||
        (soDigitos !== '' && a.protocolo.replace(/\D/g, '') === soDigitos) ||
        a.identificacaoCampo.toLowerCase() === chave.toLowerCase());

      if (!amostra) {
        return { numero: numeroLinha, dados: { chave, valores: [] }, situacao: 'erro' as const,
                 mensagem: 'Nenhuma amostra com essa identificação' };
      }

      const doLote = ensaiosPorAmostra.get(amostra.id) ?? [];
      const valores = colunasElemento.map(({ indice, parametro }) => {
        const bruto = celulas[indice] ?? '';
        const valor = lerNumero(bruto, tabela.decimalVirgula);
        const ensaio = doLote.find((e) => e.parametroId === parametro.id);

        let nota: string | undefined;
        if (bruto.trim() === '') nota = 'vazio';
        else if (valor === undefined) nota = 'não numérico';
        else if (!ensaio) nota = 'ensaio não previsto para esta amostra';
        else if (ensaio.status === 'aprovado') nota = 'já aprovado — não será sobrescrito';
        else if (parametro.limiteInferior !== undefined &&
                 (valor < parametro.limiteInferior || valor > (parametro.limiteSuperior ?? Infinity))) {
          nota = 'fora da faixa do método';
        }
        return { parametro, ensaio, valor, nota };
      });

      const aproveitaveis = valores.filter((v) => v.valor !== undefined && v.ensaio && v.ensaio.status !== 'aprovado');
      const comProblema = valores.filter((v) => v.nota && v.nota !== 'vazio');

      const situacao: SituacaoLinha =
        aproveitaveis.length === 0 ? 'erro' : comProblema.length > 0 ? 'alerta' : 'pronta';

      return {
        numero: numeroLinha,
        dados: { chave, protocolo: amostra.protocolo, valores },
        situacao,
        mensagem: aproveitaveis.length === 0
          ? 'Nenhum valor aproveitável nesta linha'
          : comProblema.length > 0
            ? `${comProblema.length} ${comProblema.length === 1 ? 'coluna com ressalva' : 'colunas com ressalva'}`
            : undefined,
      };
    });
  }, [tabela, mapeamento, estado.amostras, parametroPorId, ensaiosPorAmostra]);

  const paraGravar = useMemo(
    () => linhas.filter((l) => l.situacao !== 'erro').flatMap((l) =>
      l.dados.valores
        .filter((v) => v.valor !== undefined && v.ensaio && v.ensaio.status !== 'aprovado')
        .map((v) => ({ ensaioId: v.ensaio!.id, valor: v.valor! }))),
    [linhas],
  );

  const importar = () => {
    if (paraGravar.length === 0) { toast.error('Nada para importar.'); return; }
    lancarResultados(paraGravar);
    registrarImportacao(
      arquivo, hash, 'resultados', linhas.length, paraGravar.length,
      paraGravar, Boolean(jaImportado),
    );
    setConteudo('');
    setArquivo('');
    setMapa(null);
    toast.success(`${paraGravar.length} resultados importados`, {
      description: 'Os ensaios passaram para “lido” e seguem para revisão técnica.',
    });
  };

  const colunasElementoCount = Object.values(mapeamento).filter((v) => v !== 'chave' && v !== 'ignorar').length;

  return (
    <div className="space-y-5">
      <Entrada
        conteudo={conteudo}
        aoMudar={(v, nome) => { setConteudo(v); setMapa(null); setArquivo(nome ?? ''); }}
        exemplo={EXEMPLO_RESULTADOS}
        tabela={tabela}
      />

      {jaImportado && <AvisoRepetido importacao={jaImportado} />}

      {tabela && tabela.colunas.length > 0 && (
        <Secao
          titulo="Colunas"
          descricao={`Uma coluna identifica a amostra; as outras são elementos. ${colunasElementoCount} ${colunasElementoCount === 1 ? 'elemento reconhecido' : 'elementos reconhecidos'}.`}
          semPadding
        >
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-[hsl(var(--line-soft))]">
                  <th className="label-micro px-5 py-2.5 text-left font-medium">Coluna da planilha</th>
                  <th className="label-micro px-4 py-2.5 text-left font-medium">Exemplos</th>
                  <th className="label-micro px-4 py-2.5 text-left font-medium">Vai para</th>
                </tr>
              </thead>
              <tbody>
                {tabela.colunas.map((c) => (
                  <tr key={c.indice} className="border-b border-[hsl(var(--line-soft))] last:border-0">
                    <td className="px-5 py-2">
                      <span className="text-xs font-medium text-foreground">{c.titulo}</span>
                    </td>
                    <td className="num px-4 py-2 text-[0.68rem] text-muted-foreground">
                      {c.exemplos.join(' · ') || '—'}
                    </td>
                    <td className="px-4 py-2">
                      <Select
                        value={mapeamento[c.indice] ?? 'ignorar'}
                        onValueChange={(v) => setMapa({ ...mapeamento, [c.indice]: v })}
                      >
                        <SelectTrigger className="h-8 w-64 text-xs" aria-label={`Destino da coluna ${c.titulo}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-72">
                          <SelectItem value="ignorar">— ignorar —</SelectItem>
                          <SelectItem value="chave">Identificação da amostra</SelectItem>
                          {estado.parametros.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              <span className="num mr-2 text-[0.65rem] text-muted-foreground">{p.codigo}</span>{p.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Secao>
      )}

      {linhas.length > 0 && (
        <>
          <Resumo linhas={linhas} />
          <Secao titulo="Conferência" descricao="Linha com erro não entra; linha com alerta entra só na parte aproveitável." semPadding>
            <div className="max-h-[28rem] overflow-auto">
              <table className="w-full border-collapse text-sm">
                <thead className="sticky top-0 z-10 bg-[hsl(var(--card))]">
                  <tr className="border-b border-[hsl(var(--line-soft))]">
                    <th className="label-micro px-4 py-2.5 text-left font-medium">Linha</th>
                    <th className="label-micro px-4 py-2.5 text-left font-medium">Amostra</th>
                    <th className="label-micro px-4 py-2.5 text-left font-medium">Valores</th>
                    <th className="label-micro px-4 py-2.5 text-right font-medium">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((l) => (
                    <tr key={l.numero} className="border-b border-[hsl(var(--line-soft))] last:border-0">
                      <td className="num px-4 py-2 text-xs text-muted-foreground">{l.numero}</td>
                      <td className="px-4 py-2">
                        <span className="num block text-xs text-foreground">{l.dados.protocolo ?? l.dados.chave}</span>
                        {l.dados.protocolo && l.dados.protocolo !== l.dados.chave && (
                          <span className="block text-[0.64rem] text-muted-foreground">casou por “{l.dados.chave}”</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <span className="flex flex-wrap gap-1.5">
                          {l.dados.valores.map((v) => (
                            <span
                              key={v.parametro.id}
                              title={v.nota ?? v.parametro.nome}
                              className={cn(
                                'num inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[0.66rem]',
                                v.nota && v.nota !== 'vazio'
                                  ? 'border-[hsl(var(--warning)/0.4)] text-[hsl(var(--warning))]'
                                  : v.valor === undefined
                                    ? 'border-[hsl(var(--line-soft))] text-muted-foreground/50'
                                    : 'border-[hsl(var(--line-soft))] text-foreground',
                              )}
                            >
                              <span className="opacity-60">{v.parametro.codigo}</span>
                              {v.valor !== undefined ? numero(v.valor, v.parametro.casasDecimais) : '—'}
                            </span>
                          ))}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Pilula tom={TOM[l.situacao]} className="px-1.5 py-0 text-[0.62rem]">{l.situacao}</Pilula>
                        {l.mensagem && (
                          <span className="mt-0.5 block text-[0.62rem] text-muted-foreground">{l.mensagem}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Secao>

          <div className="sticky bottom-4 z-20 flex flex-wrap items-center gap-3 rounded-[var(--radius-lg)] border border-[hsl(var(--line-strong))] bg-[hsl(var(--card))] px-5 py-3.5 shadow-lg">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
            <p className="num flex-1 text-sm text-foreground">
              {paraGravar.length} {paraGravar.length === 1 ? 'resultado será gravado' : 'resultados serão gravados'}
            </p>
            <Button onClick={importar} disabled={paraGravar.length === 0 || !pode('analises:editar')} className="gap-2">
              <Upload className="h-4 w-4" /> Importar
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

/* ============================================================
   Fluxo 2 — amostras
   ============================================================ */

interface LinhaAmostra {
  identificacao: string;
  protocolo?: string;
  propriedade?: string;
  talhao?: string;
  profundidade?: string;
  cultura?: string;
  dataColeta?: string;
}

function ImportarAmostras() {
  const { estado, usuario, unidade, pode } = useBancada();
  const { criarRecepcao, registrarImportacao } = useAcoes();

  const [conteudo, setConteudo] = useState('');
  const [arquivo, setArquivo] = useState('');
  const [mapa, setMapa] = useState<Record<number, string> | null>(null);
  const [clienteId, setClienteId] = useState(estado.clientes[0]?.id ?? '');
  const [tipoAnaliseId, setTipoAnaliseId] = useState(estado.tiposAnalise[0]?.id ?? '');

  const tabela = useMemo(() => (conteudo.trim() ? lerTabela(conteudo) : null), [conteudo]);
  const hash = useHashDoConteudo(conteudo);
  const jaImportado = useMemo(
    () => estado.importacoes.find((i) => i.hash === hash && i.fluxo === 'amostras'),
    [estado.importacoes, hash],
  );
  const sugestao = useMemo(() => (tabela ? sugerirMapeamento(tabela.colunas, ALVOS_AMOSTRA) : {}), [tabela]);
  const mapeamento = mapa ?? sugestao;

  const pacote = estado.tiposAnalise.find((t) => t.id === tipoAnaliseId);

  const linhas = useMemo<Array<LinhaValidada<LinhaAmostra>>>(() => {
    if (!tabela) return [];
    const campo = (celulas: string[], nome: string) => {
      const i = Number(Object.entries(mapeamento).find(([, v]) => v === nome)?.[0] ?? -1);
      return i >= 0 ? (celulas[i] ?? '').trim() : '';
    };
    const vistos = new Set<string>();

    return tabela.linhas.map((celulas, i) => {
      const numeroLinha = i + (tabela.temCabecalho ? 2 : 1);
      const identificacao = campo(celulas, 'identificacao');
      const protocolo = campo(celulas, 'protocolo') || undefined;
      const textoData = campo(celulas, 'dataColeta');
      const dataColeta = textoData ? lerData(textoData) : undefined;

      const dados: LinhaAmostra = {
        identificacao,
        protocolo,
        propriedade: campo(celulas, 'propriedade') || undefined,
        talhao: campo(celulas, 'talhao') || undefined,
        profundidade: campo(celulas, 'profundidade') || undefined,
        cultura: campo(celulas, 'cultura') || undefined,
        dataColeta,
      };

      if (!identificacao) {
        return { numero: numeroLinha, dados, situacao: 'erro' as const, mensagem: 'Identificação vazia' };
      }
      if (protocolo) {
        if (vistos.has(protocolo)) {
          return { numero: numeroLinha, dados, situacao: 'erro' as const, mensagem: 'Protocolo repetido no arquivo' };
        }
        vistos.add(protocolo);
        if (estado.amostras.some((a) => a.protocolo === protocolo)) {
          return { numero: numeroLinha, dados, situacao: 'erro' as const, mensagem: 'Protocolo já existe no sistema' };
        }
      }
      if (textoData && !dataColeta) {
        return { numero: numeroLinha, dados, situacao: 'alerta' as const, mensagem: 'Data de coleta não reconhecida' };
      }
      return { numero: numeroLinha, dados, situacao: 'pronta' as const };
    });
  }, [tabela, mapeamento, estado.amostras]);

  const aceitas = linhas.filter((l) => l.situacao !== 'erro');

  const importar = useCallback(() => {
    const cliente = estado.clientes.find((c) => c.id === clienteId);
    if (!cliente || !pacote || aceitas.length === 0) {
      toast.error('Escolha o cliente e o tipo de análise.');
      return;
    }

    const agora = new Date();
    const prazo = new Date(agora);
    prazo.setDate(prazo.getDate() + pacote.prazoDias);
    const ano = String(agora.getFullYear()).slice(2);
    const base = estado.amostras.length + 30_000;

    const lote: LoteRecepcao = {
      id: `rec-imp-${Date.now()}`,
      numero: `REC-${agora.getFullYear()}-${String(700 + estado.lotesRecepcao.length).padStart(4, '0')}`,
      clienteId: cliente.id,
      dataRecepcao: agora.toISOString(),
      recebidoPorId: usuario.id,
      quantidadeAmostras: aceitas.length,
      transportadora: 'Importação de planilha',
      observacoes: `Importadas ${aceitas.length} amostras · pacote ${pacote.codigo}`,
    };

    const novasAmostras: Amostra[] = aceitas.map((l, i) => ({
      id: `am-imp-${Date.now()}-${i}`,
      protocolo: l.dados.protocolo ?? `${ano}.${String(base + i).padStart(6, '0')}`,
      loteRecepcaoId: lote.id,
      clienteId: cliente.id,
      grupoId: pacote.grupoId,
      unidadeId: unidade.id,
      identificacaoCampo: l.dados.identificacao,
      tipoAnaliseId: pacote.id,
      fazenda: l.dados.propriedade,
      talhao: l.dados.talhao,
      profundidade: l.dados.profundidade,
      cultura: l.dados.cultura,
      dataColeta: l.dados.dataColeta ?? agora.toISOString(),
      dataRecepcao: agora.toISOString(),
      prazoEntrega: prazo.toISOString(),
      status: 'recebida',
      prioridade: 'normal',
      conformeNoRecebimento: true,
      posicaoBandeja: `B${String((i % 24) + 1).padStart(2, '0')}-${String((i % 40) + 1).padStart(2, '0')}`,
    }));

    const novosEnsaios: Ensaio[] = novasAmostras.flatMap((a) =>
      pacote.parametroIds.map((pid, k) => ({
        id: `ens-imp-${Date.now()}-${a.id}-${k}`,
        amostraId: a.id,
        parametroId: pid,
        status: 'pendente' as const,
        unidade: estado.parametros.find((p) => p.id === pid)?.unidade ?? '',
      })),
    );

    criarRecepcao(lote, novasAmostras, novosEnsaios);
    registrarImportacao(
      arquivo, hash, 'amostras', aceitas.length, novasAmostras.length, [],
      Boolean(jaImportado),
    );
    setConteudo('');
    setArquivo('');
    setMapa(null);
    toast.success(`${novasAmostras.length} amostras importadas`, {
      description: `${lote.numero} · ${novosEnsaios.length} ensaios abertos · prazo ${prazo.toLocaleDateString('pt-BR')}.`,
    });
  }, [estado, clienteId, pacote, aceitas, usuario.id, unidade.id, criarRecepcao,
      registrarImportacao, arquivo, hash, jaImportado]);

  return (
    <div className="space-y-5">
      <Entrada
        conteudo={conteudo}
        aoMudar={(v, nome) => { setConteudo(v); setMapa(null); setArquivo(nome ?? ''); }}
        exemplo={EXEMPLO_AMOSTRAS}
        tabela={tabela}
      />

      {jaImportado && <AvisoRepetido importacao={jaImportado} />}

      <Secao titulo="Destino" descricao="Todas as amostras do arquivo entram neste cliente e neste pacote.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="imp-cliente" className="label-micro mb-2 block">Cliente</Label>
            <Select value={clienteId} onValueChange={setClienteId}>
              <SelectTrigger id="imp-cliente" className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-80">
                {estado.clientes.filter((c) => c.ativo).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="imp-pacote" className="label-micro mb-2 block">Tipo de análise</Label>
            <Select value={tipoAnaliseId} onValueChange={setTipoAnaliseId}>
              <SelectTrigger id="imp-pacote" className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-80">
                {estado.tiposAnalise.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    <span className="num mr-2 text-[0.65rem] text-muted-foreground">{t.codigo}</span>{t.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {pacote && (
              <p className="mt-2 text-xs text-muted-foreground">
                abre {pacote.parametroIds.length} ensaios por amostra · prazo de {pacote.prazoDias} dias
              </p>
            )}
          </div>
        </div>
      </Secao>

      {tabela && tabela.colunas.length > 0 && (
        <Secao titulo="Colunas" descricao="Confira o palpite do sistema antes de importar." semPadding>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-[hsl(var(--line-soft))]">
                  <th className="label-micro px-5 py-2.5 text-left font-medium">Coluna da planilha</th>
                  <th className="label-micro px-4 py-2.5 text-left font-medium">Exemplos</th>
                  <th className="label-micro px-4 py-2.5 text-left font-medium">Vai para</th>
                </tr>
              </thead>
              <tbody>
                {tabela.colunas.map((c) => (
                  <tr key={c.indice} className="border-b border-[hsl(var(--line-soft))] last:border-0">
                    <td className="px-5 py-2"><span className="text-xs font-medium text-foreground">{c.titulo}</span></td>
                    <td className="num px-4 py-2 text-[0.68rem] text-muted-foreground">{c.exemplos.join(' · ') || '—'}</td>
                    <td className="px-4 py-2">
                      <Select
                        value={mapeamento[c.indice] ?? 'ignorar'}
                        onValueChange={(v) => setMapa({ ...mapeamento, [c.indice]: v })}
                      >
                        <SelectTrigger className="h-8 w-60 text-xs" aria-label={`Destino da coluna ${c.titulo}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ignorar">— ignorar —</SelectItem>
                          {ALVOS_AMOSTRA.map((a) => (
                            <SelectItem key={a.campo} value={a.campo}>{a.rotulo}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="flex items-start gap-2 border-t border-[hsl(var(--line-soft))] px-5 py-3 text-[0.7rem] leading-relaxed text-muted-foreground">
            <Columns3 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Sem coluna de protocolo, o sistema gera a numeração na recepção.
          </p>
        </Secao>
      )}

      {linhas.length > 0 && (
        <>
          <Resumo linhas={linhas} />
          <Secao titulo="Conferência" semPadding>
            <div className="max-h-[26rem] overflow-auto">
              <table className="w-full border-collapse text-sm">
                <thead className="sticky top-0 z-10 bg-[hsl(var(--card))]">
                  <tr className="border-b border-[hsl(var(--line-soft))]">
                    {['Linha', 'Identificação', 'Propriedade', 'Talhão', 'Profundidade', 'Cultura', 'Situação'].map((t, i) => (
                      <th key={t} className={cn('label-micro px-4 py-2.5 font-medium', i === 6 ? 'text-right' : 'text-left')}>{t}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((l) => (
                    <tr key={l.numero} className="border-b border-[hsl(var(--line-soft))] last:border-0">
                      <td className="num px-4 py-2 text-xs text-muted-foreground">{l.numero}</td>
                      <td className="px-4 py-2 text-xs text-foreground">{l.dados.identificacao || '—'}</td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">{l.dados.propriedade ?? '—'}</td>
                      <td className="num px-4 py-2 text-xs text-muted-foreground">{l.dados.talhao ?? '—'}</td>
                      <td className="num px-4 py-2 text-xs text-muted-foreground">{l.dados.profundidade ?? '—'}</td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">{l.dados.cultura ?? '—'}</td>
                      <td className="px-4 py-2 text-right">
                        <Pilula tom={TOM[l.situacao]} className="px-1.5 py-0 text-[0.62rem]">{l.situacao}</Pilula>
                        {l.mensagem && <span className="mt-0.5 block text-[0.62rem] text-muted-foreground">{l.mensagem}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Secao>

          <div className="sticky bottom-4 z-20 flex flex-wrap items-center gap-3 rounded-[var(--radius-lg)] border border-[hsl(var(--line-strong))] bg-[hsl(var(--card))] px-5 py-3.5 shadow-lg">
            <Download className="h-4 w-4 shrink-0 text-primary" />
            <p className="num flex-1 text-sm text-foreground">
              {aceitas.length} {aceitas.length === 1 ? 'amostra será criada' : 'amostras serão criadas'}
              {pacote && ` · ${aceitas.length * pacote.parametroIds.length} ensaios`}
            </p>
            <Button onClick={importar} disabled={aceitas.length === 0 || !pode('amostras:criar')} className="gap-2">
              <Upload className="h-4 w-4" /> Importar
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

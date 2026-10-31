/* ============================================================
   BANCADA — Modelo B: Resultados de Análise de Tecido Vegetal

   Uma página por amostra, todas no mesmo laudo. O que o agrônomo
   lê primeiro não é o número: é a barra de suficiência, que diz num
   relance se o elemento está baixo, adequado ou alto para aquela
   cultura. O número confirma.

   A faixa adequada vem do cadastro, por cultura. Sem ela a página
   não é desenhada — foi imprimir mesmo assim que produziu o laudo
   de uva com "1-10" em todos os elementos.
   ============================================================ */

import { Fragment } from 'react';
import { TriangleAlert } from 'lucide-react';

import { cn } from '@/lib/utils';

import {
  ROTULO_NIVEL, faixaAdequada, nivelDeSuficiencia, textoDaFaixa, textoDaUnidade, textoDoResultado,
} from '../../lib/resultado';
import type { Suficiencia } from '../../lib/resultado';
import { dataExtenso } from '../../lib/format';
import type { AmostraDoLaudo, LaudoMontado, ResultadoLaudo } from './montar';
import type {
  Cliente, ItemSimples, Laudo, LoteRecepcao, ModeloLaudo, Unidade, Usuario,
} from '../../types';

/** Elementos que compõem a tabela principal, na ordem do modelo. */
const PRINCIPAIS = new Set(['N', 'P', 'K', 'CA', 'MG', 'S', 'B', 'CU', 'FE', 'MN', 'ZN']);

/** O código sem o sufixo da matriz: "N-FOL" é o N da folha. */
const base = (codigo: string) => codigo.replace(/-(FOL|FOLIAR)$/i, '').toUpperCase();

export function FolhaFoliar({
  laudo, montado, cliente, unidade, assinante, observacoes, modelo, lote, relacoes, solicitante,
}: {
  laudo: Laudo;
  montado: LaudoMontado;
  cliente: Cliente | undefined;
  unidade: Unidade;
  assinante: Usuario | undefined;
  observacoes: ItemSimples[];
  modelo: ModeloLaudo;
  lote: LoteRecepcao | undefined;
  /** relações entre elementos, calculadas por amostra */
  relacoes: Map<string, Array<{ nome: string; valor: number }>>;
  /** quem pediu a análise — o contato do cliente, não o laboratório */
  solicitante?: string;
}) {
  return (
    <div className="folha-laudo panel overflow-hidden">
      {montado.amostras.map(({ amostra, resultados }, i) => (
        <PaginaDaAmostra
          key={amostra.id}
          primeira={i === 0}
          amostra={amostra}
          resultados={resultados}
          laudo={laudo}
          cliente={cliente}
          unidade={unidade}
          assinante={assinante}
          observacoes={observacoes}
          modelo={modelo}
          lote={lote}
          solicitante={solicitante}
          relacoes={relacoes.get(amostra.id) ?? []}
        />
      ))}
    </div>
  );
}

function PaginaDaAmostra({
  primeira, amostra, resultados, laudo, cliente, unidade, assinante,
  observacoes, modelo, lote, relacoes, solicitante,
}: {
  primeira: boolean;
} & Omit<Parameters<typeof FolhaFoliar>[0], 'montado' | 'relacoes'>
  & { amostra: AmostraDoLaudo['amostra']; resultados: ResultadoLaudo[]; relacoes: Array<{ nome: string; valor: number }> }) {
  const principais = resultados.filter((r) => PRINCIPAIS.has(base(r.parametro.codigo)));
  const complementares = resultados.filter((r) => !PRINCIPAIS.has(base(r.parametro.codigo)));

  /* Dois quadros quando passa de quatro: é como o laboratório
     diagrama hoje, e evita um quadro alto e vazio ao lado. */
  const metade = Math.ceil(complementares.length / 2);
  const colunas = complementares.length > 4
    ? [complementares.slice(0, metade), complementares.slice(metade)]
    : [complementares];

  return (
    <section className={cn('pagina-laudo px-6 py-5', !primeira && 'border-t border-[hsl(var(--line-strong))]')}>
      {/* --- Cabeçalho do pedido --- */}
      <header>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            {modelo.logoUrl && (
              <img
                src={modelo.logoUrl} alt=""
                className="h-10 w-auto max-w-[9rem] shrink-0 object-contain"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            )}
            <div className="min-w-0">
              <p className="font-display text-base leading-tight text-foreground">{unidade.nome}</p>
              <p className="num text-[0.66rem] text-muted-foreground">
                CNPJ {unidade.cnpj} · {unidade.municipio}/{unidade.uf}
              </p>
            </div>
          </div>
          {modelo.selo && (
            <span className="shrink-0 rounded-[var(--radius-sm)] border border-[hsl(var(--line-strong))] px-2 py-1 text-[0.6rem] uppercase tracking-wide text-muted-foreground">
              {modelo.selo}
            </span>
          )}
        </div>

        <h2 className="mt-3 border-y border-[hsl(var(--line-strong))] py-1.5 text-center text-sm font-semibold text-foreground">
          Resultados de Análise de Tecido Vegetal (Foliar)
        </h2>

        <div className="laudo-pares mt-3 grid gap-x-6 gap-y-1 text-[0.68rem] sm:grid-cols-2">
          <Campo rotulo="Nº Pedido" valor={lote?.numero ?? '—'} />
          <Campo rotulo="Entrada" valor={fData(amostra.dataRecepcao)} />
          <Campo rotulo="Solicitante" valor={solicitante ?? '—'} />
          <Campo rotulo="Saída" valor={laudo.emitidoEm ? fData(laudo.emitidoEm) : '—'} />
          <Campo rotulo="Proprietário" valor={cliente?.nome ?? '—'} />
          <Campo rotulo="Nº Laudo" valor={laudo.numero} />
          <Campo rotulo="Propriedade" valor={amostra.fazenda ?? '—'} />
          <Campo rotulo="Município" valor={`${cliente?.municipio ?? ''}${cliente?.uf ? `-${cliente.uf}` : ''}` || '—'} />
        </div>
      </header>

      {/* --- Descrição da amostra --- */}
      <div className="mt-4">
        <p className="label-micro border-b border-[hsl(var(--line-strong))] pb-1 text-center">
          Descrição da amostra
        </p>
        <div className="laudo-pares mt-2 grid gap-x-6 gap-y-1 text-[0.68rem] sm:grid-cols-2">
          <Campo rotulo="Nº Amostra" valor={amostra.protocolo} />
          <Campo rotulo="Talhão" valor={amostra.talhao ?? '—'} />
          <Campo rotulo="Descrição da Amostra" valor={amostra.identificacaoCampo} />
          <Campo rotulo="Cultura" valor={amostra.cultura ?? '—'} />
        </div>
      </div>

      {/* --- Resultados e relações --- */}
      <div className="laudo-colunas mt-4 grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <TabelaElementos resultados={principais} cultura={amostra.cultura} />
        {relacoes.length > 0 && <TabelaRelacoes relacoes={relacoes} />}
      </div>

      {/* --- Complementares --- */}
      {complementares.length > 0 && (
        <div className="laudo-pares mt-4 grid gap-4 sm:grid-cols-2">
          {colunas.map((coluna, i) => (
            <TabelaComplementares key={i} resultados={coluna} />
          ))}
        </div>
      )}

      {/* --- Tabela de referência da cultura --- */}
      {modelo.mostrarTabelaReferencia && principais.length > 0 && (
        <TabelaReferencia
          resultados={principais}
          fonte={modelo.fonteReferencia}
          cultura={amostra.cultura}
        />
      )}

      {/* --- Rodapé --- */}
      <footer className="laudo-rodape-duplo mt-5 flex flex-wrap items-end justify-between gap-6 border-t border-[hsl(var(--line-soft))] pt-4">
        <div className="min-w-0 max-w-md">
          {observacoes.length > 0 && (
            <>
              <p className="label-micro mb-1">Observações</p>
              <ul className="space-y-0.5">
                {observacoes.map((o) => (
                  <li key={o.id} className="text-[0.6rem] leading-relaxed text-muted-foreground">
                    {o.nome}
                  </li>
                ))}
              </ul>
            </>
          )}
          {laudo.observacoes && (
            <p className="mt-1 text-[0.6rem] leading-relaxed text-foreground">{laudo.observacoes}</p>
          )}
        </div>

        <div className="shrink-0 text-center">
          <p className="mb-2 text-[0.62rem] text-muted-foreground">
            {unidade.municipio}/{unidade.uf}, {laudo.emitidoEm ? dataExtenso(laudo.emitidoEm) : '—'}
          </p>
          <div className="mb-1.5 h-9 w-48 border-b border-[hsl(var(--line-strong))]" />
          <p className="text-[0.68rem] font-medium uppercase text-foreground">
            {assinante?.nome ?? unidade.responsavelTecnico}
          </p>
          <p className="text-[0.6rem] uppercase tracking-wide text-muted-foreground">
            {modelo.cargoAssinatura}
          </p>
          <p className="num text-[0.6rem] text-muted-foreground">{assinante?.crq ?? unidade.crq}</p>
        </div>
      </footer>
    </section>
  );
}

/* ---------------- Tabela principal, com a barra ---------------- */

function TabelaElementos({
  resultados, cultura,
}: { resultados: ResultadoLaudo[]; cultura?: string }) {
  return (
    <div>
      <p className="label-micro mb-1.5 border-b border-[hsl(var(--line-strong))] pb-1 text-center">
        Resultados — elementos
      </p>
      <table className="w-full border-collapse text-[0.68rem]">
        <thead>
          <tr>
            <th className="label-micro px-1.5 py-1 text-left">Parâmetro</th>
            <th className="label-micro px-1.5 py-1 text-left">Unidade</th>
            <th className="label-micro px-1.5 py-1 text-right">Valor adequado</th>
            <th className="label-micro px-1.5 py-1 text-right">Resultado</th>
            <th className="label-micro px-1.5 py-1 text-center" style={{ width: '38%' }}>
              Nível de suficiência
            </th>
          </tr>
        </thead>
        <tbody>
          {resultados.map((r) => {
            /* A faixa da coluna é a *adequada* da legenda, não aquela
               em que o resultado caiu: um N abaixo do adequado cai na
               faixa "Baixo", que não tem piso, e imprimiria "—" como
               se a cultura não tivesse faixa cadastrada. */
            const faixa = faixaAdequada(r.interpretacao?.legenda.faixas);
            const suf = nivelDeSuficiencia(r.ensaio.valor, faixa?.minimo, faixa?.maximo);
            return (
              <tr key={r.ensaio.id} className="border-t border-[hsl(var(--line-soft))]">
                <td className="px-1.5 py-1 font-medium text-foreground">{base(r.parametro.codigo)}</td>
                <td className="num px-1.5 py-1 text-muted-foreground">{textoDaUnidade(r.parametro)}</td>
                <td className="num px-1.5 py-1 text-right text-muted-foreground">
                  {textoDaFaixa(faixa?.minimo, faixa?.maximo, r.parametro.casasDecimais)}
                </td>
                <td className="num px-1.5 py-1 text-right font-medium text-foreground">
                  {textoDoResultado(r.ensaio.valor, r.parametro)}
                </td>
                <td className="px-1.5 py-1">
                  {suf ? <BarraSuficiencia suficiencia={suf} /> : <SemFaixa cultura={cultura} />}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <ul className="mt-1.5 space-y-0.5 text-[0.58rem] leading-tight text-muted-foreground">
        <li>Baixo — abaixo do nível adequado para a cultura</li>
        <li>Médio — dentro do intervalo adequado para a cultura</li>
        <li>Alto — acima do nível adequado para a cultura</li>
      </ul>
    </div>
  );
}

const COR_NIVEL = {
  baixo: 'hsl(var(--danger))',
  medio: 'hsl(var(--success))',
  alto: 'hsl(var(--warning))',
} as const;

function BarraSuficiencia({ suficiencia }: { suficiencia: Suficiencia }) {
  const { nivel, posicao } = suficiencia;
  return (
    <div>
      <div className="relative h-2.5 w-full overflow-hidden rounded-[2px] border border-[hsl(var(--line-soft))]">
        {/* Os três terços, sempre visíveis: a barra é uma escala, e
            esconder o terço vazio tiraria a referência do leitor. */}
        <div className="absolute inset-0 grid grid-cols-3">
          <span className="bg-[hsl(var(--danger)/0.14)]" />
          <span className="bg-[hsl(var(--success)/0.14)]" />
          <span className="bg-[hsl(var(--warning)/0.14)]" />
        </div>
        <span
          className="absolute top-0 h-full w-[3px] -translate-x-1/2 rounded-full"
          style={{ left: `${posicao * 100}%`, background: COR_NIVEL[nivel] }}
          aria-hidden
        />
      </div>
      <p className="mt-0.5 text-center text-[0.56rem] uppercase tracking-wide" style={{ color: COR_NIVEL[nivel] }}>
        {ROTULO_NIVEL[nivel]}
      </p>
    </div>
  );
}

/** O lugar da barra quando a cultura não tem faixa cadastrada. */
function SemFaixa({ cultura }: { cultura?: string }) {
  return (
    <p className="flex items-center justify-center gap-1 text-[0.58rem] leading-tight text-[hsl(var(--warning))]">
      <TriangleAlert className="h-3 w-3 shrink-0" />
      sem faixa cadastrada{cultura ? ` para ${cultura}` : ''}
    </p>
  );
}

/* ---------------- Relações entre elementos ---------------- */

function TabelaRelacoes({ relacoes }: { relacoes: Array<{ nome: string; valor: number }> }) {
  return (
    <div>
      <p className="label-micro mb-1.5 border-b border-[hsl(var(--line-strong))] pb-1 text-center">
        Relações entre elementos
      </p>
      <table className="w-full border-collapse text-[0.68rem]">
        <thead>
          <tr>
            <th className="label-micro px-1.5 py-1 text-left">Parâmetro</th>
            <th className="label-micro px-1.5 py-1 text-center">Unidade</th>
            <th className="label-micro px-1.5 py-1 text-right">Resultado</th>
          </tr>
        </thead>
        <tbody>
          {relacoes.map((r) => (
            <tr key={r.nome} className="border-t border-[hsl(var(--line-soft))]">
              <td className="px-1.5 py-1 text-foreground">{r.nome}</td>
              {/* Relação é adimensional. */}
              <td className="num px-1.5 py-1 text-center text-muted-foreground">--</td>
              <td className="num px-1.5 py-1 text-right text-foreground">
                {r.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- Complementares ---------------- */

function TabelaComplementares({ resultados }: { resultados: ResultadoLaudo[] }) {
  return (
    <div>
      <p className="label-micro mb-1.5 border-b border-[hsl(var(--line-strong))] pb-1 text-center">
        Resultados — elementos complementares
      </p>
      <table className="w-full border-collapse text-[0.68rem]">
        <thead>
          <tr>
            <th className="label-micro px-1.5 py-1 text-left">Parâmetro</th>
            <th className="label-micro px-1.5 py-1 text-center">Unidade</th>
            <th className="label-micro px-1.5 py-1 text-right">Resultado</th>
          </tr>
        </thead>
        <tbody>
          {resultados.map((r) => (
            <tr key={r.ensaio.id} className="border-t border-[hsl(var(--line-soft))]">
              <td className="px-1.5 py-1 text-foreground">{base(r.parametro.codigo)}</td>
              <td className="num px-1.5 py-1 text-center text-muted-foreground">
                {textoDaUnidade(r.parametro)}
              </td>
              <td className="num px-1.5 py-1 text-right text-foreground">
                {textoDoResultado(r.ensaio.valor, r.parametro)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- Tabela de referência da cultura ---------------- */

function TabelaReferencia({
  resultados, fonte, cultura,
}: { resultados: ResultadoLaudo[]; fonte?: string; cultura?: string }) {
  const comFaixa = resultados.filter((r) => r.interpretacao);
  if (comFaixa.length === 0) return null;

  // Seis por linha, como no laudo do laboratório.
  const linhas: ResultadoLaudo[][] = [];
  for (let i = 0; i < comFaixa.length; i += 6) linhas.push(comFaixa.slice(i, i + 6));

  return (
    <div className="mt-4">
      <p className="text-[0.6rem] text-muted-foreground">
        Fonte: {fonte ?? '—'}
        {cultura && ` · ${cultura}`}
      </p>
      <table className="mt-1 w-full border-collapse text-center text-[0.62rem]">
        <tbody>
          {linhas.map((linha, i) => (
            <Fragment key={i}>
              <tr className="border-t border-[hsl(var(--line-soft))]">
                {linha.map((r) => (
                  <th key={r.ensaio.id} className="px-1 py-0.5 font-medium text-foreground">
                    {base(r.parametro.codigo)}
                  </th>
                ))}
              </tr>
              <tr>
                {linha.map((r) => (
                  <td key={r.ensaio.id} className="num px-1 py-0.5 text-muted-foreground">
                    {(() => {
                      const f = faixaAdequada(r.interpretacao!.legenda.faixas);
                      return textoDaFaixa(f?.minimo, f?.maximo, 1);
                    })()}
                  </td>
                ))}
              </tr>
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Campo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <p className="flex gap-2">
      <span className="shrink-0 text-muted-foreground">{rotulo}:</span>
      <span className="min-w-0 truncate font-medium text-foreground">{valor}</span>
    </p>
  );
}

/* Data curta, no fuso do laboratório. */
function fData(d: string | undefined): string {
  if (!d) return '—';
  const dt = new Date(d);
  return Number.isNaN(dt.getTime())
    ? '—'
    : dt.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

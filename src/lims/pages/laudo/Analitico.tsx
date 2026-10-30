/* ============================================================
   BANCADA — Modelo A: Laudo Analítico

   Fertilizante, composto, corretivo, orgânico. O que o cliente lê
   primeiro é a coluna Garantia ao lado do Resultado: o laudo existe
   para dizer se o lote entrega o que o rótulo promete. Resultado
   fora da garantia sai em vermelho, porque é a linha que decide.

   Uma amostra por bloco, e o cabeçalho do cliente e da amostra se
   repete a cada página — a tabela de um fertilizante completo passa
   de quarenta linhas e vira duas folhas.
   ============================================================ */

import { cn } from '@/lib/utils';

import {
  cumpreGarantia, lerGarantia, textoDaGarantia, textoDaUnidade, textoDoResultado,
} from '../../lib/resultado';
import { numero } from '../../lib/format';
import type { AmostraDoLaudo, LaudoMontado, ResultadoLaudo } from './montar';
import type { Cliente, ItemSimples, Laudo, ModeloLaudo, Unidade, Usuario } from '../../types';

/** Quantas linhas cabem numa folha antes de repetir o cabeçalho. */
const LINHAS_POR_FOLHA = 40;

export function FolhaAnalitica({
  laudo, montado, cliente, unidade, assinante, observacoes, modelo, solicitante,
}: {
  laudo: Laudo;
  montado: LaudoMontado;
  cliente: Cliente | undefined;
  unidade: Unidade;
  assinante: Usuario | undefined;
  observacoes: ItemSimples[];
  modelo: ModeloLaudo;
  solicitante?: string;
}) {
  return (
    <div className="folha-laudo panel overflow-hidden">
      {montado.amostras.map(({ amostra, resultados }, i) => (
        <BlocoDaAmostra
          key={amostra.id}
          primeiro={i === 0}
          amostra={amostra}
          resultados={resultados}
          laudo={laudo}
          cliente={cliente}
          unidade={unidade}
          assinante={assinante}
          observacoes={observacoes}
          modelo={modelo}
          solicitante={solicitante}
        />
      ))}
    </div>
  );
}

function BlocoDaAmostra({
  primeiro, amostra, resultados, laudo, cliente, unidade, assinante,
  observacoes, modelo, solicitante,
}: {
  primeiro: boolean;
  amostra: AmostraDoLaudo['amostra'];
  resultados: ResultadoLaudo[];
  laudo: Laudo;
  cliente: Cliente | undefined;
  unidade: Unidade;
  assinante: Usuario | undefined;
  observacoes: ItemSimples[];
  modelo: ModeloLaudo;
  solicitante?: string;
}) {
  /* As folhas são recortadas aqui, e não deixadas para o CSS, porque
     o cabeçalho do cliente precisa reaparecer no topo de cada uma —
     e isso o `break-inside` sozinho não faz. */
  const folhas: ResultadoLaudo[][] = [];
  for (let i = 0; i < resultados.length; i += LINHAS_POR_FOLHA) {
    folhas.push(resultados.slice(i, i + LINHAS_POR_FOLHA));
  }
  if (folhas.length === 0) folhas.push([]);

  return (
    <>
      {folhas.map((linhas, f) => (
        <section
          key={f}
          className={cn(
            'pagina-laudo px-6 py-5',
            !(primeiro && f === 0) && 'border-t border-[hsl(var(--line-strong))]',
          )}
        >
          <Timbre unidade={unidade} modelo={modelo} />

          <h2 className="mt-3 text-center font-display text-lg text-foreground">Laudo Analítico</h2>
          <p className="num mt-0.5 text-center text-xs text-muted-foreground">
            Laudo Nº: {laudo.numero}
            {folhas.length > 1 && ` · folha ${f + 1} de ${folhas.length}`}
          </p>

          <BlocoCliente cliente={cliente} solicitante={solicitante} />
          <BlocoAmostra amostra={amostra} laudo={laudo} />

          <p className="label-micro mt-4 border-b border-[hsl(var(--line-strong))] pb-1 text-center">
            Resultados dos ensaios
          </p>
          <TabelaEnsaios resultados={linhas} />

          {/* Observações e assinatura só na última folha da amostra. */}
          {f === folhas.length - 1 && (
            <Rodape
              laudo={laudo}
              unidade={unidade}
              assinante={assinante}
              observacoes={observacoes}
              modelo={modelo}
            />
          )}
        </section>
      ))}
    </>
  );
}

/* ---------------- Timbre ---------------- */

function Timbre({ unidade, modelo }: { unidade: Unidade; modelo: ModeloLaudo }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3">
        {modelo.logoUrl && (
          <img
            src={modelo.logoUrl} alt=""
            className="h-11 w-auto max-w-[10rem] shrink-0 object-contain"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        )}
        <div className="min-w-0">
          <p className="font-display text-base leading-tight text-foreground">{unidade.nome}</p>
          <p className="num text-[0.64rem] text-muted-foreground">
            CNPJ {unidade.cnpj} · {unidade.municipio}/{unidade.uf}
          </p>
          {modelo.cabecalho?.split('\n').filter((l) => l.trim()).map((linha) => (
            <p key={linha} className="text-[0.64rem] text-muted-foreground">{linha}</p>
          ))}
        </div>
      </div>
      {modelo.registroMapa && (
        <span className="num shrink-0 rounded-[var(--radius-sm)] border border-[hsl(var(--line-strong))] px-2 py-1 text-[0.6rem] text-muted-foreground">
          {modelo.registroMapa}
        </span>
      )}
    </header>
  );
}

/* ---------------- Blocos de identificação ---------------- */

function BlocoCliente({
  cliente, solicitante,
}: { cliente: Cliente | undefined; solicitante?: string }) {
  return (
    <div className="mt-3 rounded-[var(--radius-sm)] bg-[hsl(var(--surface-sunken))] px-3.5 py-2.5">
      <div className="grid gap-x-6 gap-y-1 text-[0.68rem] sm:grid-cols-2">
        <Campo rotulo="Cliente" valor={cliente?.nome ?? '—'} />
        <Campo rotulo="Solicitante" valor={solicitante ?? '—'} />
        <Campo rotulo="Endereço" valor={cliente?.logradouro ?? '—'} />
        <Campo rotulo="EP" valor="" />
        <Campo
          rotulo="Município"
          valor={cliente ? `${cliente.municipio}-${cliente.uf}` : '—'}
        />
      </div>
    </div>
  );
}

function BlocoAmostra({ amostra, laudo }: { amostra: AmostraDoLaudo['amostra']; laudo: Laudo }) {
  return (
    <div className="mt-2.5 grid gap-x-6 gap-y-1 text-[0.68rem] sm:grid-cols-2">
      <Campo rotulo="Ident. amostra" valor={amostra.identificacaoCampo} />
      <Campo rotulo="Nº amostra" valor={amostra.protocolo} />
      <Campo rotulo="Data de entrada no laboratório" valor={dia(amostra.dataRecepcao)} />
      <Campo rotulo="Data de coleta" valor={dia(amostra.dataColeta)} />
      <Campo rotulo="Data de fabricação" valor={dia(amostra.dataFabricacao)} />
      <Campo rotulo="Fornecedor" valor={amostra.fornecedor ?? '-'} />
      <Campo rotulo="Fechado em" valor={dia(laudo.emitidoEm)} />
      <Campo rotulo="Quantidade" valor={amostra.quantidade ?? '-'} />
      <Campo rotulo="Data de validade" valor={dia(amostra.dataValidade)} />
      <Campo rotulo="Natureza física" valor={amostra.naturezaFisica ?? '-'} />
      <Campo rotulo="Lote" valor={amostra.lote ?? '-'} />
    </div>
  );
}

/* ---------------- Tabela de ensaios ---------------- */

function TabelaEnsaios({ resultados }: { resultados: ResultadoLaudo[] }) {
  if (resultados.length === 0) {
    return (
      <p className="py-4 text-center text-[0.7rem] text-muted-foreground">
        Sem resultado aprovado para esta amostra.
      </p>
    );
  }

  return (
    <table className="w-full border-collapse text-[0.68rem]">
      <thead>
        <tr>
          <th className="label-micro px-1.5 py-1 text-left">Determinação</th>
          <th className="label-micro px-1.5 py-1 text-right">Garantia</th>
          <th className="label-micro px-1.5 py-1 text-right">Resultado</th>
          <th className="label-micro px-1.5 py-1 text-left">Unidade</th>
          <th className="label-micro px-1.5 py-1 text-right">LQ</th>
          <th className="label-micro px-1.5 py-1 text-left">Método</th>
        </tr>
      </thead>
      <tbody>
        {resultados.map((r) => {
          const garantia = lerGarantia(r.ensaio.garantia);
          const atende = cumpreGarantia(r.ensaio.valor, garantia);
          return (
            <tr key={r.ensaio.id} className="border-t border-[hsl(var(--line-soft))]">
              <td className="px-1.5 py-1 text-foreground">{r.parametro.nome}</td>
              <td className="num px-1.5 py-1 text-right text-muted-foreground">
                {textoDaGarantia(garantia, r.parametro.casasDecimais)}
              </td>
              {/* Fora da garantia em vermelho: é a linha que reprova o lote. */}
              <td
                className={cn(
                  'num px-1.5 py-1 text-right font-medium',
                  atende ? 'text-foreground' : 'text-[hsl(var(--danger))]',
                )}
              >
                {textoDoResultado(r.ensaio.valor, r.parametro)}
              </td>
              <td className="num px-1.5 py-1 text-muted-foreground">
                {textoDaUnidade(r.parametro)}
              </td>
              <td className="num px-1.5 py-1 text-right text-muted-foreground">
                {r.parametro.lq === undefined ? '' : numero(r.parametro.lq, r.parametro.casasDecimais)}
              </td>
              <td className="max-w-[13rem] truncate px-1.5 py-1 text-[0.64rem] text-muted-foreground">
                {r.parametro.metodo}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/* ---------------- Rodapé ---------------- */

function Rodape({
  laudo, unidade, assinante, observacoes, modelo,
}: {
  laudo: Laudo;
  unidade: Unidade;
  assinante: Usuario | undefined;
  observacoes: ItemSimples[];
  modelo: ModeloLaudo;
}) {
  const temObservacao = observacoes.length > 0 || laudo.observacoes;
  return (
    <>
      {temObservacao && (
        <div className="mt-4 border-t border-[hsl(var(--line-soft))] pt-3">
          <p className="label-micro mb-1">Observações</p>
          {laudo.observacoes && (
            <p className="text-[0.66rem] uppercase leading-relaxed text-foreground">
              {laudo.observacoes}
            </p>
          )}
          <ul className="mt-1 space-y-0.5">
            {observacoes.map((o) => (
              <li key={o.id} className="text-[0.62rem] leading-relaxed text-muted-foreground">
                {o.nome}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 text-center">
        <div className="mx-auto mb-1.5 h-9 w-56 border-b border-[hsl(var(--line-strong))]" />
        <p className="text-[0.68rem] text-foreground">
          <span className="text-muted-foreground">{modelo.cargoAssinatura}: </span>
          {assinante?.nome ?? unidade.responsavelTecnico}
          <span className="num text-muted-foreground"> / {assinante?.crq ?? unidade.crq}</span>
        </p>
      </div>
    </>
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

function dia(d: string | undefined): string {
  if (!d) return '';
  const dt = new Date(d);
  return Number.isNaN(dt.getTime())
    ? ''
    : dt.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

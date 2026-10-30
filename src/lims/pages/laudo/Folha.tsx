/* ============================================================
   BANCADA — a folha do laudo

   É o único artefato do sistema que sai do laboratório e vira
   documento do cliente. Por isso ele carrega, para cada número:
   unidade, método, incerteza e a interpretação contra a tabela de
   referência que o laboratório adotou — mais as próprias fontes,
   porque auditor pergunta contra o que se interpretou.
   ============================================================ */

import { FileQuestion } from 'lucide-react';

import { cn } from '@/lib/utils';

import { Pilula, Vazio } from '../../components/primitivos';
import { ChipPh } from '../../components/ph-visual';
import { TOM_SEVERIDADE } from '../../lib/interpretacao';
import { textoDaUnidade, textoDoResultado } from '../../lib/resultado';
import { dataExtenso, numero } from '../../lib/format';
import type { LaudoMontado, ResultadoLaudo } from './montar';
import type { Cliente, GrupoAnalise, ItemSimples, Laudo, ModeloLaudo, Unidade, Usuario } from '../../types';

export type Disposicao = 'amostra' | 'matriz';

/** O valor como ele aparece no laudo, com o chip de pH quando for pH. */
function Valor({ r, tamanho = 'sm' }: { r: ResultadoLaudo; tamanho?: 'sm' | 'md' }) {
  const { ensaio, parametro } = r;
  if (ensaio.valor === undefined) return <span className="text-muted-foreground">—</span>;
  if (parametro.ehPh) {
    return <ChipPh valor={ensaio.valor} extrator={parametro.extrator ?? 'H2O'} tamanho={tamanho} />;
  }
  return <span className="num text-foreground">{textoDoResultado(ensaio.valor, parametro)}</span>;
}

function Interpretacao({ r }: { r: ResultadoLaudo }) {
  if (!r.interpretacao) return <span className="text-muted-foreground">—</span>;
  const { faixa } = r.interpretacao;
  return (
    <Pilula tom={TOM_SEVERIDADE[faixa.severidade]} className="px-1.5 py-0 text-[0.62rem]">
      {faixa.rotulo}
    </Pilula>
  );
}

export function FolhaLaudo({
  laudo, montado, cliente, grupo, unidade, assinante, observacoes, disposicao, modelo,
}: {
  laudo: Laudo;
  montado: LaudoMontado;
  cliente: Cliente | undefined;
  grupo: GrupoAnalise | undefined;
  unidade: Unidade;
  assinante: Usuario | undefined;
  observacoes: ItemSimples[];
  disposicao: Disposicao;
  modelo: ModeloLaudo;
}) {
  const vazio = montado.totalResultados === 0;

  return (
    <div className="folha-laudo panel overflow-hidden">
      {/* --- Papel timbrado --- */}
      <div className="border-b border-[hsl(var(--line-soft))] bg-[hsl(var(--surface-sunken))] px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            {modelo.logoUrl && (
              /* O logotipo é do laboratório; um endereço quebrado não
                 pode deixar um buraco no timbre do documento. */
              <img
                src={modelo.logoUrl} alt=""
                className="h-10 w-auto max-w-[9rem] shrink-0 object-contain"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            )}
            <div className="min-w-0">
            <p className="font-display text-xl leading-tight text-foreground">{unidade.nome}</p>
            <p className="num mt-1 text-[0.68rem] text-muted-foreground">
              CNPJ {unidade.cnpj} · {unidade.municipio}/{unidade.uf}
            </p>
            <p className="mt-0.5 text-[0.68rem] text-muted-foreground">{unidade.acreditacao}</p>
            {modelo.cabecalho?.split('\n').filter((l) => l.trim()).map((linha) => (
              <p key={linha} className="text-[0.68rem] text-muted-foreground">{linha}</p>
            ))}
            </div>
          </div>
          <div className="text-right">
            <p className="label-micro">Laudo nº</p>
            <p className="num text-sm font-semibold text-foreground">{laudo.numero}</p>
            <p className="num mt-1 text-[0.66rem] text-muted-foreground">versão {laudo.versao}</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-5">
        <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <Campo rotulo="Cliente" valor={cliente?.nome ?? '—'} />
          <Campo rotulo="CNPJ" valor={cliente?.documento ?? '—'} mono />
          <Campo rotulo="Município" valor={`${cliente?.municipio ?? ''}/${cliente?.uf ?? ''}`} />
          <Campo rotulo="Grupo de análise" valor={grupo?.nome ?? '—'} />
          <Campo rotulo="Emissão" valor={laudo.emitidoEm ? dataExtenso(laudo.emitidoEm) : 'não emitido'} />
          <Campo rotulo="Código de verificação" valor={laudo.hashDocumento ?? '—'} mono />
          <Campo rotulo="Amostras" valor={String(montado.amostras.length)} mono />
          <Campo rotulo="Determinações" valor={String(montado.totalResultados)} mono />
        </div>

        {vazio ? (
          /* Laudo sem resultado aprovado não desenha tabela vazia: diz
             por que está vazio. Era o que faltava para o laudo em
             branco não parecer defeito de renderização. */
          <div className="mt-6 rounded-[var(--radius-sm)] border border-dashed border-[hsl(var(--line-strong))]">
            <Vazio
              icone={FileQuestion}
              titulo="Nenhum resultado aprovado ainda"
              descricao="O laudo só exibe resultado que passou pela revisão técnica. Aprove os ensaios destas amostras na tela de Revisão para que eles apareçam aqui."
            />
          </div>
        ) : disposicao === 'amostra' ? (
          <PorAmostra montado={montado} modelo={modelo} />
        ) : (
          <Matriz montado={montado} modelo={modelo} />
        )}

        {!vazio && modelo.mostrarMetodos && (
          <>
            <Metodos montado={montado} />
            {modelo.mostrarInterpretacao && montado.fontes.length > 0 && (
              <div className="mt-5 border-t border-[hsl(var(--line-soft))] pt-4">
                <p className="label-micro mb-2">Referências de interpretação</p>
                <ul className="space-y-0.5">
                  {montado.fontes.map((f) => (
                    <li key={f} className="text-[0.68rem] text-muted-foreground">{f}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {/* --- Observações --- */}
        {(observacoes.length > 0 || laudo.observacoes) && (
          <div className="mt-5 border-t border-[hsl(var(--line-soft))] pt-4">
            <p className="label-micro mb-2">Observações</p>
            <ol className="space-y-1.5">
              {observacoes.map((o, i) => (
                <li key={o.id} className="flex gap-2 text-[0.68rem] leading-relaxed text-muted-foreground">
                  <span className="num shrink-0">{i + 1}.</span>
                  <span>{o.nome}</span>
                </li>
              ))}
              {laudo.observacoes && (
                <li className="flex gap-2 text-[0.68rem] leading-relaxed text-foreground">
                  <span className="num shrink-0">{observacoes.length + 1}.</span>
                  <span>{laudo.observacoes}</span>
                </li>
              )}
            </ol>
          </div>
        )}

        {/* --- Assinatura --- */}
        <div className="mt-8 flex flex-wrap items-end justify-between gap-6 border-t border-[hsl(var(--line-soft))] pt-6">
          <p className="max-w-sm text-[0.62rem] leading-relaxed text-muted-foreground">
            {modelo.rodape?.trim()
              || 'Este documento tem validade apenas na íntegra. A autenticidade pode ser conferida no portal do laboratório pelo código de verificação.'}
          </p>
          <div className="shrink-0 text-center">
            <div className="mb-1.5 h-10 w-44 border-b border-[hsl(var(--line-strong))]" />
            <p className="text-[0.68rem] font-medium text-foreground">
              {assinante?.nome ?? unidade.responsavelTecnico}
            </p>
            {/* O registro é da pessoa que assina, não da unidade: laudo
                com o nome de um e o CRQ de outro não se sustenta numa
                auditoria. */}
            <p className="num text-[0.62rem] text-muted-foreground">
              {assinante?.crq ?? unidade.crq}
            </p>
            <p className="mt-0.5 text-[0.6rem] uppercase tracking-wide text-muted-foreground/70">
              {modelo.cargoAssinatura}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Disposição por amostra ---------------- */

/** Uma tabela por amostra — a leitura que o agrônomo faz em campo. */
function PorAmostra({ montado, modelo }: { montado: LaudoMontado; modelo: ModeloLaudo }) {
  return (
    <div className="mt-6 space-y-5">
      {montado.amostras.map(({ amostra, resultados }) => (
        <section key={amostra.id} className="bloco-amostra">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-[hsl(var(--line-strong))] pb-1.5">
            <p className="num text-xs font-semibold text-foreground">{amostra.protocolo}</p>
            <p className="min-w-0 flex-1 truncate text-right text-[0.68rem] text-muted-foreground">
              {amostra.identificacaoCampo}
              {amostra.posicaoBandeja && <span className="num ml-2">· {amostra.posicaoBandeja}</span>}
            </p>
          </div>

          {resultados.length === 0 ? (
            <p className="py-2 text-[0.68rem] text-muted-foreground">
              Sem resultado aprovado para esta amostra.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr>
                    <th className="label-micro px-2 py-1.5 text-left">Ensaio</th>
                    <th className="label-micro px-2 py-1.5 text-right">Resultado</th>
                    <th className="label-micro px-2 py-1.5 text-left">Unidade</th>
                    {modelo.mostrarInterpretacao && (
                      <th className="label-micro px-2 py-1.5 text-left">Interpretação</th>
                    )}
                    {modelo.mostrarIncerteza && (
                      <th className="label-micro px-2 py-1.5 text-right">Incerteza</th>
                    )}
                    {modelo.mostrarMetodos && (
                      <th className="label-micro px-2 py-1.5 text-left">Método</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {resultados.map((r) => (
                    <tr key={r.ensaio.id} className="border-t border-[hsl(var(--line-soft))]">
                      <td className="px-2 py-1.5">
                        <span className="num text-[0.68rem] text-muted-foreground">{r.parametro.codigo}</span>
                        <span className="ml-1.5 text-foreground">{r.parametro.nome}</span>
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        <Valor r={r} />
                      </td>
                      <td className="num px-2 py-1.5 text-[0.68rem] text-muted-foreground">
                        {textoDaUnidade(r.parametro)}
                      </td>
                      {modelo.mostrarInterpretacao && (
                        <td className="px-2 py-1.5">
                          <Interpretacao r={r} />
                        </td>
                      )}
                      {modelo.mostrarIncerteza && (
                        <td className="num px-2 py-1.5 text-right text-[0.68rem] text-muted-foreground">
                          {r.parametro.incerteza === undefined
                            ? '—'
                            : `± ${numero(r.parametro.incerteza, 2)}`}
                        </td>
                      )}
                      {modelo.mostrarMetodos && (
                        <td className="max-w-[14rem] truncate px-2 py-1.5 text-[0.66rem] text-muted-foreground">
                          {r.parametro.metodo}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}

/* ---------------- Disposição em matriz ---------------- */

/** Amostras nas linhas, ensaios nas colunas — a conferência do lote. */
function Matriz({ montado, modelo }: { montado: LaudoMontado; modelo: ModeloLaudo }) {
  return (
    <div className="mt-6 overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-[hsl(var(--line-strong))]">
            <th className="label-micro px-2 py-2 text-left">Protocolo</th>
            <th className="label-micro px-2 py-2 text-left">Identificação</th>
            {montado.parametros.map((p) => (
              <th key={p.id} className="label-micro px-2 py-2 text-right">
                {p.codigo}
                {p.unidade && <span className="ml-0.5 normal-case">({p.unidade})</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {montado.amostras.map(({ amostra, resultados }) => {
            const porParametro = new Map(resultados.map((r) => [r.parametro.id, r]));
            return (
              <tr key={amostra.id} className="border-b border-[hsl(var(--line-soft))]">
                <td className="num px-2 py-2 text-foreground">{amostra.protocolo}</td>
                <td className="max-w-[12rem] truncate px-2 py-2 text-muted-foreground">
                  {amostra.identificacaoCampo}
                </td>
                {montado.parametros.map((p) => {
                  const r = porParametro.get(p.id);
                  return (
                    <td key={p.id} className="px-2 py-2 text-right align-top">
                      {!r ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <>
                          <Valor r={r} />
                          {modelo.mostrarInterpretacao && r.interpretacao && (
                            <span
                              className={cn(
                                'mt-0.5 block text-[0.58rem] leading-tight',
                                CLASSE_SEVERIDADE[r.interpretacao.faixa.severidade],
                              )}
                            >
                              {r.interpretacao.faixa.rotulo}
                            </span>
                          )}
                        </>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const CLASSE_SEVERIDADE: Record<string, string> = {
  critico: 'text-[hsl(var(--danger))]',
  atencao: 'text-[hsl(var(--warning))]',
  bom: 'text-muted-foreground',
  ideal: 'text-[hsl(var(--success))]',
  neutro: 'text-muted-foreground',
};

/* ---------------- Métodos ---------------- */

function Metodos({ montado }: { montado: LaudoMontado }) {
  return (
    <div className="mt-6 border-t border-[hsl(var(--line-soft))] pt-4">
      <p className="label-micro mb-2.5">Métodos empregados</p>
      <ul className="space-y-1">
        {montado.parametros.map((p) => (
          <li key={p.id} className="text-[0.68rem] leading-relaxed text-muted-foreground">
            <span className="num text-foreground">{p.codigo}</span> — {p.nome}: {p.metodo}
            {p.unidade && <span className="num"> · {p.unidade}</span>}
            {p.incerteza !== undefined && (
              <span className="num"> · incerteza expandida ± {numero(p.incerteza, 2)}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Campo({ rotulo, valor, mono }: { rotulo: string; valor: string; mono?: boolean }) {
  return (
    <div>
      <p className="label-micro mb-0.5">{rotulo}</p>
      <p className={mono ? 'num text-xs text-foreground' : 'text-xs text-foreground'}>{valor}</p>
    </div>
  );
}

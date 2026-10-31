/* ============================================================
   BANCADA — anexo de recomendação agronômica

   O laudo diz o que o solo tem; este anexo diz o que fazer com
   ele. São dois documentos de propósito, e não por capricho de
   layout:

   O laudo é ensaio, assinado pelo responsável técnico do
   laboratório, e o que ele afirma é verificável — mediu-se.
   A recomendação é prescrição: depende de cultura, expectativa
   de produtividade, histórico da área e do critério de quem
   assina, e no Brasil é ato privativo de engenheiro agrônomo
   (CREA). Imprimir as duas coisas na mesma folha, sob a mesma
   assinatura, faria o laboratório prescrever sem habilitação.

   Por isso o anexo sai em folha própria, cita a tabela que usou
   e tem campo de assinatura separado.
   ============================================================ */

import { cn } from '@/lib/utils';

import { dataExtenso, numero, numeroAte } from '../../lib/format';
import type { Recomendacao } from '../../lib/recomendacao';
import type { AmostraDoLaudo } from './montar';
import type { Cliente, Laudo, ModeloLaudo, Unidade } from '../../types';

/* ---------------- Peças ---------------- */

function Timbre({ unidade, modelo }: { unidade: Unidade; modelo: ModeloLaudo }) {
  return (
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
      <span className="shrink-0 rounded-[var(--radius-sm)] border border-[hsl(var(--line-strong))] px-2 py-1 text-[0.6rem] uppercase tracking-wide text-muted-foreground">
        Anexo — recomendação
      </span>
    </div>
  );
}

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[0.58rem] uppercase tracking-wide text-muted-foreground">{rotulo}</p>
      <p className="truncate text-[0.72rem] text-foreground">{children}</p>
    </div>
  );
}

/**
 * Uma dose, grande, com a unidade ao lado — é o número que o cliente
 * procura.
 *
 * `casas` é fixo de propósito: calcário sai sempre com uma decimal e
 * adubo sempre inteiro. Deixar o formatador decidir fazia "1,2 t/ha"
 * aparecer ao lado de "1 t/ha" na mesma linha, como se uma fosse
 * mais precisa que a outra.
 */
function Dose({
  rotulo, valor, unidade, detalhe, casas = 0,
}: { rotulo: string; valor?: number; unidade: string; detalhe?: string; casas?: number }) {
  return (
    <div className="rounded-[var(--radius-sm)] border border-[hsl(var(--line))] px-3 py-2">
      <p className="text-[0.58rem] uppercase tracking-wide text-muted-foreground">{rotulo}</p>
      {valor === undefined ? (
        <p className="text-[0.78rem] text-muted-foreground">não calculado</p>
      ) : (
        <p className="num text-base leading-tight text-foreground">
          {numero(valor, casas)}
          <span className="ml-1 text-[0.62rem] text-muted-foreground">{unidade}</span>
        </p>
      )}
      {detalhe && <p className="mt-0.5 text-[0.6rem] text-muted-foreground">{detalhe}</p>}
    </div>
  );
}

/** O que impediu de calcular. Dizer é mais útil que devolver zero. */
function Pendencias({ itens }: { itens: string[] }) {
  if (itens.length === 0) return null;
  return (
    <p className="mt-1.5 text-[0.62rem] text-[hsl(var(--warning))]">
      Faltou para calcular: {itens.join('; ')}.
    </p>
  );
}

const ROTULO_METODO: Record<string, string> = {
  'saturacao-bases': 'Saturação por bases',
  'neutralizacao-al': 'Neutralização do alumínio',
  smp: 'Curva SMP',
};

/* ---------------- Folha ---------------- */

export interface FolhaRecomendacaoProps {
  laudo: Laudo;
  amostras: Array<{ item: AmostraDoLaudo; recomendacao: Recomendacao }>;
  cliente?: Cliente;
  unidade: Unidade;
  modelo: ModeloLaudo;
  /** o nome da cultura pelo código: o cadastro guarda 'CANA', o cliente lê 'Cana-de-açúcar' */
  nomeDaCultura: (codigo: string) => string;
}

export function FolhaRecomendacao({
  laudo, amostras, cliente, unidade, modelo, nomeDaCultura,
}: FolhaRecomendacaoProps) {
  if (amostras.length === 0) return null;

  return (
    /* Mesmo invólucro dos outros modelos: é `.folha-laudo` que a
       folha de estilo de impressão usa para redefinir as cores e
       isolar o documento do resto da aplicação. */
    <div className="folha-laudo folha-anexo panel overflow-hidden">
      {amostras.map(({ item, recomendacao }, i) => (
        <section
          key={item.amostra.id}
          className={cn(
            'pagina-laudo px-6 py-5',
            i > 0 && 'border-t border-[hsl(var(--line-strong))]',
          )}
        >
          <header>
            <Timbre unidade={unidade} modelo={modelo} />
            <h2 className="mt-4 font-display text-lg leading-tight text-foreground">
              Recomendação de calagem e adubação
            </h2>
            <p className="num text-[0.66rem] text-muted-foreground">
              Anexo ao laudo {laudo.numero} · amostra {item.amostra.protocolo}
            </p>
          </header>

          {/* --- Identificação --- */}
          <div className="laudo-colunas mt-4 grid gap-4 border-y border-[hsl(var(--line))] py-3 md:grid-cols-[2fr_1fr]">
            <div className="laudo-pares grid grid-cols-2 gap-x-4 gap-y-2">
              <Campo rotulo="Cliente">{cliente?.nome ?? '—'}</Campo>
              <Campo rotulo="Propriedade">{item.amostra.fazenda ?? '—'}</Campo>
              <Campo rotulo="Talhão">{item.amostra.talhao ?? '—'}</Campo>
              <Campo rotulo="Profundidade">{item.amostra.profundidade ?? '—'}</Campo>
            </div>
            <div className="laudo-pares grid grid-cols-2 gap-x-4 gap-y-2">
              <Campo rotulo="Cultura">
                {recomendacao.cultura
                  ? nomeDaCultura(recomendacao.cultura.cultura)
                  : item.amostra.cultura ?? '—'}
              </Campo>
              <Campo rotulo="Produtividade">
                {recomendacao.adubacao.produtividade !== undefined
                  ? `${numeroAte(recomendacao.adubacao.produtividade, 1)} `
                    + `${recomendacao.adubacao.unidadeProdutividade ?? ''}`.trim()
                  : '—'}
              </Campo>
            </div>
          </div>

          {/* --- Calagem --- */}
          <section className="mt-4">
            <h3 className="text-[0.7rem] font-medium uppercase tracking-wide text-foreground">
              Calagem
            </h3>
            <p className="text-[0.62rem] text-muted-foreground">
              {ROTULO_METODO[recomendacao.calagem.metodo] ?? recomendacao.calagem.metodo}
              {' · '}incorporação a {recomendacao.calagem.profundidade} cm
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <Dose
                rotulo="Calcário" casas={1}
                valor={recomendacao.calagem.dose}
                unidade="t/ha"
                detalhe={`corretivo com PRNT ${numeroAte(recomendacao.calagem.prnt, 0)}%`}
              />
              <Dose
                rotulo="Equivalente PRNT 100%" casas={1}
                valor={recomendacao.calagem.dosePrnt100}
                unidade="t/ha"
                detalhe="como a tabela publica"
              />
            </div>
            {recomendacao.calagem.memoria && (
              <p className="num mt-1.5 text-[0.6rem] text-muted-foreground">
                {recomendacao.calagem.memoria}
              </p>
            )}
            <Pendencias itens={recomendacao.calagem.faltando} />
          </section>

          {/* --- Gessagem --- */}
          <section className="mt-4">
            <h3 className="text-[0.7rem] font-medium uppercase tracking-wide text-foreground">
              Gessagem
            </h3>
            {recomendacao.gessagem.indicado ? (
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <Dose rotulo="Gesso agrícola" valor={recomendacao.gessagem.dose} unidade="kg/ha" />
                <p className="self-center text-[0.62rem] text-muted-foreground">
                  {recomendacao.gessagem.motivo}
                </p>
              </div>
            ) : (
              <p className="mt-1 text-[0.66rem] text-muted-foreground">
                {recomendacao.gessagem.motivo}
              </p>
            )}
            <Pendencias itens={recomendacao.gessagem.faltando} />
          </section>

          {/* --- Adubação --- */}
          <section className="mt-4">
            <h3 className="text-[0.7rem] font-medium uppercase tracking-wide text-foreground">
              Adubação de manutenção
            </h3>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              <Dose
                rotulo="Nitrogênio (N)"
                valor={recomendacao.adubacao.nitrogenio}
                unidade="kg/ha"
                detalhe="da cultura, não da análise"
              />
              <Dose
                rotulo="Fósforo (P₂O₅)"
                valor={recomendacao.adubacao.fosforo}
                unidade="kg/ha"
                detalhe={recomendacao.adubacao.classeFosforo
                  ? `teor no solo: ${recomendacao.adubacao.classeFosforo.toLowerCase()}`
                  : undefined}
              />
              <Dose
                rotulo="Potássio (K₂O)"
                valor={recomendacao.adubacao.potassio}
                unidade="kg/ha"
                detalhe={recomendacao.adubacao.classePotassio
                  ? `teor no solo: ${recomendacao.adubacao.classePotassio.toLowerCase()}`
                  : undefined}
              />
            </div>
            {recomendacao.adubacao.memoria.length > 0 && (
              <ul className="mt-1.5 space-y-0.5">
                {recomendacao.adubacao.memoria.map((m) => (
                  <li key={m} className="text-[0.6rem] text-muted-foreground">{m}</li>
                ))}
              </ul>
            )}
            <Pendencias itens={recomendacao.adubacao.faltando} />
            {recomendacao.cultura?.observacao && (
              <p className="mt-1.5 text-[0.62rem] text-foreground">
                {recomendacao.cultura.observacao}
              </p>
            )}
          </section>

          {/* --- Referência e assinatura --- */}
          <footer className="mt-5 border-t border-[hsl(var(--line))] pt-3">
            <p className="text-[0.6rem] leading-relaxed text-muted-foreground">
              Tabela de referência: <span className="text-foreground">{recomendacao.tabela.nome}</span>
              {' '}({recomendacao.tabela.regiao}) — {recomendacao.tabela.fonte}.
            </p>
            <p className="mt-1.5 text-[0.6rem] leading-relaxed text-muted-foreground">
              As doses acima derivam dos resultados do laudo {laudo.numero} aplicados à tabela
              citada. Recomendação de calagem e adubação é ato privativo de engenheiro
              agrônomo: só vale acompanhada da assinatura e do registro CREA do profissional
              que a prescreve, a quem cabe ponderar histórico da área, manejo e expectativa de
              produtividade. O laboratório responde pelos resultados analíticos, não pela
              prescrição.
            </p>
            <div className="laudo-rodape-duplo mt-6 grid gap-6 sm:grid-cols-2">
              <div>
                <div className="h-px w-full bg-[hsl(var(--line-strong))]" />
                <p className="mt-1 text-[0.62rem] text-foreground">Engenheiro agrônomo responsável</p>
                <p className="text-[0.58rem] text-muted-foreground">CREA nº ______________</p>
              </div>
              <div className="text-right">
                <p className="text-[0.58rem] text-muted-foreground">
                  {laudo.emitidoEm
                    ? `Emitido em ${dataExtenso(laudo.emitidoEm)}`
                    : 'Laudo ainda não emitido'}
                </p>
              </div>
            </div>
          </footer>
        </section>
      ))}
    </div>
  );
}

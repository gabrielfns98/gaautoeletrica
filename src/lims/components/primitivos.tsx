/* ============================================================
   BANCADA — primitivos de interface
   Vocabulário visual reutilizado por todos os módulos.
   ============================================================ */

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Search, SlidersHorizontal } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { contem, numero } from '../lib/format';

/* ---------------- Cabeçalho de página ---------------- */

export function CabecalhoPagina({
  titulo, descricao, eyebrow, acoes, children,
}: {
  titulo: string;
  descricao?: string;
  eyebrow?: string;
  acoes?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="animate-rise mb-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow && <p className="label-micro mb-2">{eyebrow}</p>}
          <h1 className="font-display text-[2.1rem] leading-[1.05] tracking-tight text-foreground sm:text-[2.6rem]">
            {titulo}
          </h1>
          {descricao && (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{descricao}</p>
          )}
        </div>
        {acoes && <div className="flex shrink-0 flex-wrap items-center gap-2">{acoes}</div>}
      </div>
      {children}
    </header>
  );
}

/* ---------------- Cartão de indicador ---------------- */

export function Indicador({
  rotulo, valor, sufixo, detalhe, variacao, icone: Icone, destaque, className,
}: {
  rotulo: string;
  valor: ReactNode;
  sufixo?: string;
  detalhe?: string;
  variacao?: number;
  icone?: ComponentType<{ className?: string }>;
  destaque?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'panel relative overflow-hidden p-5 transition-colors duration-200',
        destaque && 'border-primary/35',
        className,
      )}
    >
      {destaque && (
        <span className="ph-spectrum absolute inset-x-0 top-0 h-px opacity-70" aria-hidden />
      )}
      <div className="flex items-start justify-between gap-3">
        <p className="label-micro">{rotulo}</p>
        {Icone && <Icone className="h-4 w-4 shrink-0 text-muted-foreground" />}
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="num text-[1.85rem] font-semibold leading-none text-foreground">{valor}</span>
        {sufixo && <span className="num text-sm text-muted-foreground">{sufixo}</span>}
      </div>
      <div className="mt-2.5 flex items-center gap-2">
        {variacao !== undefined && Number.isFinite(variacao) && (
          <span
            className={cn(
              'num inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[0.7rem] font-medium',
              variacao >= 0
                ? 'bg-[hsl(var(--success)/0.14)] text-[hsl(var(--success))]'
                : 'bg-destructive/14 text-destructive',
            )}
          >
            {variacao >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            {numero(Math.abs(variacao), 1)}%
          </span>
        )}
        {detalhe && <p className="truncate text-xs text-muted-foreground">{detalhe}</p>}
      </div>
    </div>
  );
}

/* ---------------- Pílula de status ---------------- */

export type TomStatus = 'neutro' | 'info' | 'sucesso' | 'alerta' | 'erro' | 'primario';

const TONS: Record<TomStatus, string> = {
  neutro: 'bg-muted text-muted-foreground border-border',
  info: 'bg-[hsl(var(--ph-11)/0.14)] text-[hsl(var(--ph-11))] border-[hsl(var(--ph-11)/0.3)]',
  sucesso: 'bg-[hsl(var(--success)/0.14)] text-[hsl(var(--success))] border-[hsl(var(--success)/0.3)]',
  alerta: 'bg-[hsl(var(--warning)/0.16)] text-[hsl(var(--warning))] border-[hsl(var(--warning)/0.32)]',
  erro: 'bg-destructive/14 text-destructive border-destructive/30',
  primario: 'bg-primary/14 text-primary border-primary/30',
};

export function Pilula({
  children, tom = 'neutro', pontinho, className,
}: {
  children: ReactNode;
  tom?: TomStatus;
  pontinho?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium',
        TONS[tom],
        className,
      )}
    >
      {pontinho && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

/* ---------------- Seção com moldura ---------------- */

export function Secao({
  titulo, descricao, acoes, children, className, semPadding,
}: {
  titulo?: string;
  descricao?: string;
  acoes?: ReactNode;
  children: ReactNode;
  className?: string;
  semPadding?: boolean;
}) {
  return (
    <section className={cn('panel overflow-hidden', className)}>
      {(titulo || acoes) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[hsl(var(--line-soft))] px-5 py-4">
          <div className="min-w-0">
            {titulo && <h2 className="text-sm font-semibold tracking-tight text-foreground">{titulo}</h2>}
            {descricao && <p className="mt-0.5 text-xs text-muted-foreground">{descricao}</p>}
          </div>
          {acoes && <div className="flex items-center gap-2">{acoes}</div>}
        </div>
      )}
      <div className={semPadding ? '' : 'p-5'}>{children}</div>
    </section>
  );
}

/* ---------------- Estado vazio ---------------- */

export function Vazio({
  titulo, descricao, icone: Icone, acao,
}: {
  titulo: string;
  descricao?: string;
  icone?: ComponentType<{ className?: string }>;
  acao?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {Icone && (
        <div className="panel-sunken mb-4 flex h-12 w-12 items-center justify-center">
          <Icone className="h-5 w-5 text-muted-foreground" />
        </div>
      )}
      <p className="text-sm font-medium text-foreground">{titulo}</p>
      {descricao && <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">{descricao}</p>}
      {acao && <div className="mt-4">{acao}</div>}
    </div>
  );
}

/* ---------------- Barra de ferramentas ---------------- */

export function BarraFiltros({
  busca, aoBuscar, placeholder = 'Buscar…', children,
}: {
  busca: string;
  aoBuscar: (v: string) => void;
  placeholder?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div className="relative min-w-[13rem] flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={busca}
          onChange={(e) => aoBuscar(e.target.value)}
          placeholder={placeholder}
          className="h-9 border-border bg-[hsl(var(--surface-sunken))] pl-9 text-sm"
        />
      </div>
      {children}
      {!children && <SlidersHorizontal className="h-4 w-4 text-muted-foreground/40" />}
    </div>
  );
}

/* ---------------- Tabela de dados ---------------- */

export interface Coluna<T> {
  chave: string;
  titulo: string;
  /** conteúdo da célula */
  render: (linha: T) => ReactNode;
  /** valor usado para ordenar e buscar; ausente desabilita a ordenação */
  valor?: (linha: T) => string | number;
  alinhamento?: 'esquerda' | 'direita' | 'centro';
  largura?: string;
  /** esconde a coluna em telas estreitas */
  secundaria?: boolean;
}

/**
 * `dados` é a única fonte de inferência de T: os demais props usam NoInfer
 * para não disputarem o parâmetro de tipo. Isso permite escrever
 * `<Tabela dados={amostras} …>` sem argumento de tipo explícito — o que,
 * além de mais limpo, evita a sintaxe `<Tabela<Amostra>` em JSX, que o
 * transformador de desenvolvimento do Lovable não consegue analisar.
 */
export function Tabela<T>({
  colunas, dados, chaveDe, aoClicar, vazio, denso, ordenacaoInicial, rodape,
}: {
  colunas: Array<Coluna<NoInfer<T>>>;
  dados: T[];
  chaveDe: (linha: NoInfer<T>) => string;
  aoClicar?: (linha: NoInfer<T>) => void;
  vazio?: ReactNode;
  denso?: boolean;
  ordenacaoInicial?: { chave: string; direcao: 'asc' | 'desc' };
  rodape?: ReactNode;
}) {
  const [ordem, setOrdem] = useState(ordenacaoInicial);
  const caixa = useRef<HTMLDivElement>(null);
  const [sobraEsquerda, setSobraEsquerda] = useState(false);
  const [sobraDireita, setSobraDireita] = useState(false);

  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const medir = () => {
      setSobraEsquerda(el.scrollLeft > 4);
      setSobraDireita(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    };
    medir();
    el.addEventListener('scroll', medir, { passive: true });
    const observador = new ResizeObserver(medir);
    observador.observe(el);
    return () => {
      el.removeEventListener('scroll', medir);
      observador.disconnect();
    };
  }, [dados.length, colunas.length]);

  const ordenados = useMemo(() => {
    if (!ordem) return dados;
    const coluna = colunas.find((c) => c.chave === ordem.chave);
    if (!coluna?.valor) return dados;
    const sinal = ordem.direcao === 'asc' ? 1 : -1;
    return [...dados].sort((a, b) => {
      const va = coluna.valor!(a);
      const vb = coluna.valor!(b);
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * sinal;
      return String(va).localeCompare(String(vb), 'pt-BR') * sinal;
    });
  }, [dados, ordem, colunas]);

  const alternar = (chave: string) => {
    setOrdem((o) =>
      o?.chave === chave
        ? { chave, direcao: o.direcao === 'asc' ? 'desc' : 'asc' }
        : { chave, direcao: 'asc' },
    );
  };

  const alinhar = (a?: Coluna<T>['alinhamento']) =>
    a === 'direita' ? 'text-right' : a === 'centro' ? 'text-center' : 'text-left';

  if (dados.length === 0 && vazio) {
    return <>{vazio}</>;
  }

  return (
    <div className="relative">
      <div ref={caixa} className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-[hsl(var(--line-soft))]">
            {colunas.map((c) => (
              <th
                key={c.chave}
                style={c.largura ? { width: c.largura } : undefined}
                className={cn(
                  'label-micro whitespace-nowrap px-4 py-2.5 font-medium',
                  alinhar(c.alinhamento),
                  c.secundaria && 'hidden lg:table-cell',
                )}
              >
                {c.valor ? (
                  <button
                    type="button"
                    onClick={() => alternar(c.chave)}
                    className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
                  >
                    {c.titulo}
                    {ordem?.chave === c.chave ? (
                      ordem.direcao === 'asc'
                        ? <ArrowUp className="h-3 w-3" />
                        : <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-30" />
                    )}
                  </button>
                ) : (
                  c.titulo
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ordenados.map((linha) => (
            <tr
              key={chaveDe(linha)}
              onClick={aoClicar ? () => aoClicar(linha) : undefined}
              tabIndex={aoClicar ? 0 : undefined}
              onKeyDown={aoClicar ? (e) => { if (e.key === 'Enter') aoClicar(linha); } : undefined}
              className={cn(
                'border-b border-[hsl(var(--line-soft))] transition-colors last:border-0',
                aoClicar && 'cursor-pointer hover:bg-[hsl(var(--surface-raised))]',
              )}
            >
              {colunas.map((c) => (
                <td
                  key={c.chave}
                  className={cn(
                    // Código de lote e protocolo não podem quebrar em três
                    // linhas: a tabela rola, o texto não se parte.
                    'whitespace-nowrap px-4 align-middle',
                    denso ? 'py-2' : 'py-3',
                    alinhar(c.alinhamento),
                    c.secundaria && 'hidden lg:table-cell',
                  )}
                >
                  {c.render(linha)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {rodape && (
          <tfoot className="border-t-2 border-[hsl(var(--line-strong))]">
            {rodape}
          </tfoot>
        )}
      </table>
      </div>

      {/* Numa tela estreita a tabela rola de lado, e sem indicação ninguém
          descobre que há coluna escondida. A sombra aparece só do lado em
          que ainda há conteúdo. */}
      {sobraEsquerda && <Sombra lado="esquerda" />}
      {sobraDireita && <Sombra lado="direita" />}
    </div>
  );
}

function Sombra({ lado }: { lado: 'esquerda' | 'direita' }) {
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-y-0 w-8',
        lado === 'direita'
          ? 'right-0 bg-gradient-to-l from-[hsl(var(--card))] to-transparent'
          : 'left-0 bg-gradient-to-r from-[hsl(var(--card))] to-transparent',
      )}
    />
  );
}

/** Filtro em memória aplicável antes de entregar os dados à Tabela. */
export function filtrar<T>(dados: T[], termo: string, campos: (linha: T) => Array<string | undefined>): T[] {
  if (!termo.trim()) return dados;
  return dados.filter((d) => campos(d).some((c) => c && contem(c, termo)));
}

/* ---------------- Abas segmentadas ---------------- */

/**
 * Dois parâmetros de tipo porque o estado costuma ser mais amplo que as
 * abas exibidas: `V` é o tipo do filtro inteiro e `T`, o subconjunto que
 * este controle oferece. A restrição `T extends V` garante que toda opção
 * mostrada é um valor válido do estado, e `aoMudar` só recebe o que o
 * usuário realmente consegue clicar.
 */
export function Segmentos<V extends string, T extends V = V>({
  valor, aoMudar, opcoes, className,
}: {
  valor: V;
  aoMudar: (v: T) => void;
  opcoes: Array<{ valor: T; rotulo: string; contagem?: number }>;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn('panel-sunken inline-flex flex-wrap gap-0.5 p-1', className)}
    >
      {opcoes.map((o) => {
        const ativo = o.valor === valor;
        return (
          <button
            key={o.valor}
            role="tab"
            aria-selected={ativo}
            type="button"
            onClick={() => aoMudar(o.valor)}
            className={cn(
              'rounded-[calc(var(--radius)-4px)] px-3 py-1.5 text-xs font-medium transition-all duration-150',
              ativo
                ? 'bg-[hsl(var(--surface-raised))] text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {o.rotulo}
            {o.contagem !== undefined && (
              <span className={cn('num ml-1.5 text-[0.68rem]', ativo ? 'text-primary' : 'opacity-60')}>
                {o.contagem}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- Lista de pares rótulo/valor ---------------- */

export function Campos({
  itens, colunas = 2,
}: {
  itens: Array<{ rotulo: string; valor: ReactNode }>;
  colunas?: 1 | 2 | 3;
}) {
  return (
    <dl
      className={cn(
        'grid gap-x-6 gap-y-4',
        colunas === 1 ? 'grid-cols-1' : colunas === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2',
      )}
    >
      {itens.map((i) => (
        <Fragment key={i.rotulo}>
          <div className="min-w-0">
            <dt className="label-micro mb-1">{i.rotulo}</dt>
            <dd className="truncate text-sm text-foreground">{i.valor}</dd>
          </div>
        </Fragment>
      ))}
    </dl>
  );
}

/* ---------------- Barra de proporção ---------------- */

export function BarraProporcao({
  segmentos, altura = 8,
}: {
  segmentos: Array<{ rotulo: string; valor: number; cor: string }>;
  altura?: number;
}) {
  const total = segmentos.reduce((s, x) => s + x.valor, 0) || 1;
  return (
    <div>
      <div
        className="flex w-full overflow-hidden rounded-full bg-[hsl(var(--surface-sunken))]"
        style={{ height: altura }}
      >
        {segmentos.map((s) => (
          <div
            key={s.rotulo}
            title={`${s.rotulo}: ${s.valor}`}
            style={{ width: `${(s.valor / total) * 100}%`, background: s.cor }}
            className="transition-all duration-500"
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {segmentos.filter((s) => s.valor > 0).map((s) => (
          <span key={s.rotulo} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-sm" style={{ background: s.cor }} aria-hidden />
            {s.rotulo}
            <span className="num text-foreground">{s.valor}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

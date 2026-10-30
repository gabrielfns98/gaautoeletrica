/* ============================================================
   BANCADA — edição de cadastro
   Doze listas com o mesmo comportamento: novo, editar, duplicar
   e desativar. Em vez de doze CRUDs iguais, um painel que recebe
   as colunas da tabela e a definição dos campos do formulário.

   Desativar, nunca excluir: amostra antiga referencia o elemento
   que o laboratório parou de vender, e laudo emitido não pode
   perder o método que o gerou.
   ============================================================ */

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Copy, Pencil, Plus, Power, PowerOff } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

import { useBancada } from '../data/store';
import { BarraFiltros, Pilula, Secao, Tabela, Vazio, filtrar } from './primitivos';
import type { Coluna } from './primitivos';

/** Identificador novo, legível na auditoria. */
export const novoId = (prefixo: string) =>
  `${prefixo}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/* ---------------- Campos ---------------- */

export type CampoDef<T> =
  | { tipo: 'texto'; chave: keyof T & string; rotulo: string; dica?: string; largura?: 1 | 2; obrigatorio?: boolean }
  | { tipo: 'area'; chave: keyof T & string; rotulo: string; dica?: string }
  | { tipo: 'numero'; chave: keyof T & string; rotulo: string; passo?: number; min?: number; max?: number; sufixo?: string; largura?: 1 | 2 }
  | { tipo: 'selecao'; chave: keyof T & string; rotulo: string; opcoes: Array<{ valor: string; rotulo: string }>; largura?: 1 | 2 }
  | { tipo: 'booleano'; chave: keyof T & string; rotulo: string; dica?: string };

/* Interface de domínio não tem índice de string, então a leitura por
   chave passa por uma vista bruta — o tipo do campo já foi conferido na
   definição, que é onde o erro aparece se a chave não existir. */
export function Formulario<T extends { id: string }>({
  campos, valor, aoMudar, extra,
}: {
  // `valor` é a única fonte de inferência: sem isto, T sairia do próprio
  // array de campos e colapsaria para { id: string }.
  campos: Array<CampoDef<NoInfer<T>>>;
  valor: T;
  aoMudar: (v: NoInfer<T>) => void;
  extra?: ReactNode;
}) {
  const bruto = valor as unknown as Record<string, unknown>;
  const definir = (chave: string, v: unknown) => aoMudar({ ...valor, [chave]: v } as T);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {campos.map((c) => {
        const id = `campo-${String(c.chave)}`;
        const largura = 'largura' in c && c.largura === 2 ? 'sm:col-span-2' : '';

        if (c.tipo === 'booleano') {
          return (
            <div key={id} className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-border px-3 py-2 sm:col-span-2">
              <div>
                <Label htmlFor={id} className="text-sm">{c.rotulo}</Label>
                {c.dica && <p className="mt-0.5 text-xs text-muted-foreground">{c.dica}</p>}
              </div>
              <Switch
                id={id}
                checked={Boolean(bruto[c.chave])}
                onCheckedChange={(v) => definir(c.chave, v)}
              />
            </div>
          );
        }

        return (
          <div key={id} className={cn('space-y-1.5', c.tipo === 'area' ? 'sm:col-span-2' : largura)}>
            <Label htmlFor={id} className="text-xs text-muted-foreground">{c.rotulo}</Label>

            {c.tipo === 'texto' && (
              <Input
                id={id} value={String(bruto[c.chave] ?? '')}
                onChange={(e) => definir(c.chave, e.target.value)}
                className="h-9 text-sm"
              />
            )}

            {c.tipo === 'area' && (
              <Textarea
                id={id} rows={3} value={String(bruto[c.chave] ?? '')}
                onChange={(e) => definir(c.chave, e.target.value)}
                className="resize-y text-sm"
              />
            )}

            {c.tipo === 'numero' && (
              <div className="relative">
                <Input
                  id={id} type="number" inputMode="decimal"
                  step={c.passo ?? 1} min={c.min} max={c.max}
                  value={bruto[c.chave] === undefined || bruto[c.chave] === null ? '' : String(bruto[c.chave])}
                  onChange={(e) => definir(c.chave, e.target.value === '' ? undefined : Number(e.target.value))}
                  className={cn('num h-9 text-sm', c.sufixo && 'pr-12')}
                />
                {c.sufixo && (
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    {c.sufixo}
                  </span>
                )}
              </div>
            )}

            {c.tipo === 'selecao' && (
              <Select value={String(bruto[c.chave] ?? '')} onValueChange={(v) => definir(c.chave, v)}>
                <SelectTrigger id={id} className="h-9 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {c.opcoes.map((o) => (
                    <SelectItem key={o.valor} value={o.valor}>{o.rotulo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {'dica' in c && c.dica && <p className="text-[0.68rem] text-muted-foreground">{c.dica}</p>}
          </div>
        );
      })}
      {extra}
    </div>
  );
}

/* ---------------- Painel ---------------- */

export function PainelRegistro<T extends { id: string }>({
  titulo, descricao, itens, colunas, campos, criar, aoSalvar, ativoDe, alternarAtivo,
  rotuloDe, camposBusca, extraFormulario, validar, larguraDialogo,
}: {
  titulo: string;
  descricao?: string;
  itens: T[];
  colunas: Array<Coluna<NoInfer<T>>>;
  campos: Array<CampoDef<NoInfer<T>>>;
  /** item em branco para o botão Novo */
  criar: () => NoInfer<T>;
  aoSalvar: (item: NoInfer<T>) => void;
  /** item desativado aparece esmaecido e com ação de reativar */
  ativoDe: (item: NoInfer<T>) => boolean;
  alternarAtivo: (item: NoInfer<T>) => NoInfer<T>;
  rotuloDe: (item: NoInfer<T>) => string;
  camposBusca: (item: NoInfer<T>) => Array<string | undefined>;
  extraFormulario?: (rascunho: NoInfer<T>, aoMudar: (v: NoInfer<T>) => void) => ReactNode;
  /** mensagem quando o rascunho não pode ser salvo */
  validar?: (rascunho: NoInfer<T>) => string | undefined;
  larguraDialogo?: string;
}) {
  const { pode } = useBancada();
  const [busca, setBusca] = useState('');
  const [rascunho, setRascunho] = useState<T | null>(null);
  const [novoItem, setNovoItem] = useState(false);

  const editavel = pode('configuracoes:editar');
  const visiveis = useMemo(() => filtrar(itens, busca, camposBusca), [itens, busca, camposBusca]);
  const erro = rascunho && validar ? validar(rascunho) : undefined;

  const abrirNovo = () => { setRascunho(criar()); setNovoItem(true); };
  const abrirEdicao = (item: T) => { setRascunho({ ...item }); setNovoItem(false); };
  /* Duplicar é o atalho que o laboratório usa para criar o próximo item
     parecido; o código ganha sufixo porque costuma ser único. */
  const duplicar = (item: T) => {
    const bruto = item as unknown as Record<string, unknown>;
    setRascunho({
      ...item,
      id: novoId('cad'),
      ...(typeof bruto.codigo === 'string' ? { codigo: `${bruto.codigo}-COPIA` } : {}),
    } as T);
    setNovoItem(true);
  };

  const salvar = () => {
    if (!rascunho || erro) return;
    aoSalvar(rascunho);
    setRascunho(null);
  };

  const colunasComAcoes: Array<Coluna<T>> = [
    ...colunas,
    {
      chave: '__acoes',
      titulo: '',
      alinhamento: 'direita',
      render: (item) => (
        <span className="flex items-center justify-end gap-0.5">
          <Button
            variant="ghost" size="icon" className="h-7 w-7"
            title="Editar" aria-label={`Editar ${rotuloDe(item)}`}
            onClick={() => abrirEdicao(item)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost" size="icon" className="h-7 w-7"
            title="Duplicar" aria-label={`Duplicar ${rotuloDe(item)}`}
            onClick={() => duplicar(item)}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost" size="icon" className="h-7 w-7"
            title={ativoDe(item) ? 'Desativar' : 'Reativar'}
            aria-label={`${ativoDe(item) ? 'Desativar' : 'Reativar'} ${rotuloDe(item)}`}
            onClick={() => aoSalvar(alternarAtivo(item))}
          >
            {ativoDe(item)
              ? <PowerOff className="h-3.5 w-3.5" />
              : <Power className="h-3.5 w-3.5 text-[hsl(var(--success))]" />}
          </Button>
        </span>
      ),
    },
  ];

  return (
    <Secao
      titulo={titulo}
      descricao={descricao}
      semPadding
      acoes={editavel ? (
        <Button size="sm" onClick={abrirNovo} className="h-8 gap-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" /> Novo
        </Button>
      ) : undefined}
    >
      <div className="px-5 pt-4">
        <BarraFiltros busca={busca} aoBuscar={setBusca} placeholder={`Buscar em ${titulo.toLowerCase()}…`} />
      </div>

      <Tabela
        denso
        colunas={editavel ? colunasComAcoes : colunas}
        dados={visiveis}
        chaveDe={(i) => i.id}
        vazio={<Vazio titulo={`Nenhum item em ${titulo.toLowerCase()}`} descricao={editavel ? 'Use o botão Novo para cadastrar.' : undefined} />}
      />

      <Dialog open={rascunho !== null} onOpenChange={(a) => { if (!a) setRascunho(null); }}>
        <DialogContent className={cn('max-h-[88vh] overflow-y-auto', larguraDialogo ?? 'sm:max-w-xl')}>
          <DialogHeader>
            <DialogTitle>{novoItem ? `Novo — ${titulo}` : `Editar — ${titulo}`}</DialogTitle>
            <DialogDescription>
              {novoItem
                ? 'O item nasce ativo e já aparece nas telas que usam este cadastro.'
                : 'A alteração vale daqui para frente; o que já foi emitido mantém o que estava registrado.'}
            </DialogDescription>
          </DialogHeader>

          {rascunho && (
            <Formulario
              campos={campos}
              valor={rascunho}
              aoMudar={setRascunho}
              extra={extraFormulario?.(rascunho, setRascunho)}
            />
          )}

          {erro && (
            <p role="alert" className="rounded-[var(--radius-sm)] bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {erro}
            </p>
          )}

          <DialogFooter className="gap-2">
            {rascunho && !ativoDe(rascunho) && <Pilula tom="alerta">desativado</Pilula>}
            <Button variant="ghost" onClick={() => setRascunho(null)}>Cancelar</Button>
            <Button onClick={salvar} disabled={Boolean(erro)}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Secao>
  );
}

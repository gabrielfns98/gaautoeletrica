/* ============================================================
   BANCADA — ações sobre uma amostra protocolada

   A recepção erra o talhão, o cliente liga pedindo mais um ensaio,
   a etiqueta borra na impressora e de vez em quando a amostra é
   cancelada. Nada disso justifica reprotocolar: o protocolo é a
   identidade da amostra e já está no código de barras, no laudo e
   na planilha do instrumento.
   ============================================================ */

import { useMemo, useState } from 'react';
import { Ban, FlaskConical, Pencil, Printer } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

import { useAcoes, useBancada, useIndices } from '../../data/store';
import { Pilula } from '../../components/primitivos';
import { FolhaEtiquetaAvulsa } from '../../components/Etiqueta';
import { dataISOLocal } from '../../lib/format';
import type { Amostra, Prioridade } from '../../types';

type Aberta = 'editar' | 'escopo' | 'cancelar' | null;

export function AcoesAmostra({ amostra }: { amostra: Amostra }) {
  const { pode } = useBancada();
  const [aberta, setAberta] = useState<Aberta>(null);
  const [imprimindo, setImprimindo] = useState(false);

  const { clientePorId, grupoPorId } = useIndices();

  const podeEditar = pode('amostras:editar');
  const encerrada = amostra.status === 'cancelada' || amostra.status === 'liberada';

  /* A etiqueta só entra no DOM durante a impressão: fora disso ela
     ocuparia espaço na tela sem ninguém pedir. */
  const reimprimir = () => {
    setImprimindo(true);
    // Deixa o React pintar a etiqueta antes de abrir o diálogo do sistema.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.print();
        setImprimindo(false);
      });
    });
  };

  return (
    <>
      <div className="mt-6 flex flex-wrap gap-2 border-t border-[hsl(var(--line-soft))] pt-5">
        {podeEditar && !encerrada && (
          <Button variant="outline" onClick={() => setAberta('editar')} className="gap-2">
            <Pencil className="h-4 w-4" /> Editar dados
          </Button>
        )}
        {podeEditar && !encerrada && (
          <Button variant="outline" onClick={() => setAberta('escopo')} className="gap-2">
            <FlaskConical className="h-4 w-4" /> Incluir / retirar análise
          </Button>
        )}
        <Button variant="outline" onClick={reimprimir} className="gap-2">
          <Printer className="h-4 w-4" /> Reimprimir etiqueta
        </Button>
        {podeEditar && amostra.status !== 'cancelada' && (
          <Button
            variant="outline"
            onClick={() => setAberta('cancelar')}
            className="gap-2 text-[hsl(var(--danger))] hover:text-[hsl(var(--danger))]"
          >
            <Ban className="h-4 w-4" /> Cancelar amostra
          </Button>
        )}
      </div>

      {imprimindo && (
        <div className="pointer-events-none absolute left-0 top-0 opacity-0">
          <FolhaEtiquetaAvulsa
            amostra={amostra}
            cliente={clientePorId.get(amostra.clienteId)?.nome ?? ''}
            grupo={grupoPorId.get(amostra.grupoId)?.abreviacao ?? ''}
          />
        </div>
      )}

      {aberta === 'editar' && <DialogoEditar amostra={amostra} aoFechar={() => setAberta(null)} />}
      {aberta === 'escopo' && <DialogoEscopo amostra={amostra} aoFechar={() => setAberta(null)} />}
      {aberta === 'cancelar' && <DialogoCancelar amostra={amostra} aoFechar={() => setAberta(null)} />}
    </>
  );
}

/* ---------------- Editar dados de campo ---------------- */

function DialogoEditar({ amostra, aoFechar }: { amostra: Amostra; aoFechar: () => void }) {
  const { estado } = useBancada();
  const { editarAmostra } = useAcoes();

  const [form, setForm] = useState({
    identificacaoCampo: amostra.identificacaoCampo,
    fazenda: amostra.fazenda ?? '',
    talhao: amostra.talhao ?? '',
    profundidade: amostra.profundidade ?? '',
    cultura: amostra.cultura ?? '',
    dataColeta: dataISOLocal(amostra.dataColeta),
    prazoEntrega: dataISOLocal(amostra.prazoEntrega),
    prioridade: amostra.prioridade,
    posicaoBandeja: amostra.posicaoBandeja ?? '',
  });

  const campo = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const salvar = () => {
    if (!form.identificacaoCampo.trim()) {
      toast.error('A identificação de campo não pode ficar vazia.');
      return;
    }

    const dados: Partial<Amostra> = {
      identificacaoCampo: form.identificacaoCampo.trim(),
      fazenda: form.fazenda.trim() || undefined,
      talhao: form.talhao.trim() || undefined,
      profundidade: form.profundidade || undefined,
      cultura: form.cultura || undefined,
      prioridade: form.prioridade,
      posicaoBandeja: form.posicaoBandeja.trim() || undefined,
    };
    // Data vinda de <input type="date"> é dia local; vira meio-dia para
    // não escorregar um dia ao virar UTC.
    if (form.dataColeta) dados.dataColeta = new Date(`${form.dataColeta}T12:00:00`).toISOString();
    if (form.prazoEntrega) dados.prazoEntrega = new Date(`${form.prazoEntrega}T12:00:00`).toISOString();

    const mudou = (Object.keys(dados) as Array<keyof Amostra>)
      .filter((k) => String(dados[k] ?? '') !== String(amostra[k] ?? ''));

    if (mudou.length === 0) {
      toast.info('Nada mudou.');
      aoFechar();
      return;
    }

    editarAmostra(amostra.id, dados, `Campos alterados: ${mudou.join(', ')}`);
    toast.success(`${amostra.protocolo} atualizada.`);
    aoFechar();
  };

  return (
    <Dialog open onOpenChange={(a) => { if (!a) aoFechar(); }}>
      <DialogContent className="bancada max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar amostra <span className="num">{amostra.protocolo}</span></DialogTitle>
          <DialogDescription>
            O protocolo não muda: ele já está na etiqueta, no laudo e na planilha do instrumento.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label className="label-micro mb-2 block" htmlFor="ed-ident">Identificação de campo</Label>
            <Input
              id="ed-ident" value={form.identificacaoCampo}
              onChange={(e) => campo('identificacaoCampo', e.target.value)} className="h-10"
            />
          </div>

          <div>
            <Label className="label-micro mb-2 block" htmlFor="ed-fazenda">Fazenda</Label>
            <Input id="ed-fazenda" value={form.fazenda} onChange={(e) => campo('fazenda', e.target.value)} className="h-10" />
          </div>
          <div>
            <Label className="label-micro mb-2 block" htmlFor="ed-talhao">Talhão</Label>
            <Input id="ed-talhao" value={form.talhao} onChange={(e) => campo('talhao', e.target.value)} className="h-10" />
          </div>

          <div>
            <Label className="label-micro mb-2 block">Profundidade</Label>
            <Select value={form.profundidade || 'nenhuma'} onValueChange={(v) => campo('profundidade', v === 'nenhuma' ? '' : v)}>
              <SelectTrigger className="h-10"><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="nenhuma">—</SelectItem>
                {estado.profundidades.filter((p) => p.ativo).map((p) => (
                  <SelectItem key={p.id} value={p.nome}>{p.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="label-micro mb-2 block">Cultura</Label>
            <Select value={form.cultura || 'nenhuma'} onValueChange={(v) => campo('cultura', v === 'nenhuma' ? '' : v)}>
              <SelectTrigger className="h-10"><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="nenhuma">—</SelectItem>
                {estado.culturas.filter((c) => c.ativo).map((c) => (
                  <SelectItem key={c.id} value={c.codigo}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="label-micro mb-2 block" htmlFor="ed-coleta">Data da coleta</Label>
            <Input
              id="ed-coleta" type="date" value={form.dataColeta}
              onChange={(e) => campo('dataColeta', e.target.value)} className="num h-10"
            />
          </div>
          <div>
            <Label className="label-micro mb-2 block" htmlFor="ed-prazo">Prazo de entrega</Label>
            <Input
              id="ed-prazo" type="date" value={form.prazoEntrega}
              onChange={(e) => campo('prazoEntrega', e.target.value)} className="num h-10"
            />
          </div>

          <div>
            <Label className="label-micro mb-2 block">Prioridade</Label>
            <Select value={form.prioridade} onValueChange={(v) => campo('prioridade', v as Prioridade)}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="urgente">Urgente</SelectItem>
                <SelectItem value="emergencial">Emergencial</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="label-micro mb-2 block" htmlFor="ed-bandeja">Posição na bandeja</Label>
            <Input
              id="ed-bandeja" value={form.posicaoBandeja}
              onChange={(e) => campo('posicaoBandeja', e.target.value)} className="num h-10"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={aoFechar}>Cancelar</Button>
          <Button onClick={salvar}>Salvar alterações</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Incluir / retirar ensaio ---------------- */

function DialogoEscopo({ amostra, aoFechar }: { amostra: Amostra; aoFechar: () => void }) {
  const { estado } = useBancada();
  const { incluirEnsaios, removerEnsaio } = useAcoes();

  const doGrupo = useMemo(
    () => estado.parametros.filter((p) => p.grupoId === amostra.grupoId && p.ativo),
    [estado.parametros, amostra.grupoId],
  );

  const ensaios = useMemo(
    () => estado.ensaios.filter((e) => e.amostraId === amostra.id),
    [estado.ensaios, amostra.id],
  );
  const porParametro = useMemo(
    () => new Map(ensaios.map((e) => [e.parametroId, e])),
    [ensaios],
  );

  const [aIncluir, setAIncluir] = useState<string[]>([]);

  const alternar = (id: string) =>
    setAIncluir((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const retirar = (ensaioId: string) => {
    const r = removerEnsaio(ensaioId);
    if (!r.ok) { toast.error('Não dá para retirar este ensaio', { description: r.motivo }); return; }
    toast.success('Ensaio retirado do escopo.');
  };

  const confirmar = () => {
    const n = incluirEnsaios(amostra, aIncluir);
    toast.success(n === 1 ? '1 ensaio incluído.' : `${n} ensaios incluídos.`);
    aoFechar();
  };

  return (
    <Dialog open onOpenChange={(a) => { if (!a) aoFechar(); }}>
      <DialogContent className="bancada max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Escopo de <span className="num">{amostra.protocolo}</span></DialogTitle>
          <DialogDescription>
            Marque o que entra. Ensaio já lido não sai do escopo — ele é repetido ou fica
            como está, para a trilha de auditoria continuar verdadeira.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-1.5">
          {doGrupo.map((p) => {
            const ensaio = porParametro.get(p.id);
            const marcado = aIncluir.includes(p.id);
            return (
              <li
                key={p.id}
                className={cn(
                  'flex items-center gap-3 rounded-[var(--radius-sm)] border px-3 py-2',
                  ensaio
                    ? 'border-[hsl(var(--line-soft))] bg-[hsl(var(--surface-sunken))]'
                    : marcado
                      ? 'border-primary/40 bg-primary/5'
                      : 'border-[hsl(var(--line-soft))]',
                )}
              >
                {!ensaio && (
                  <Checkbox checked={marcado} onCheckedChange={() => alternar(p.id)} />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-foreground">
                    <span className="num mr-1.5 text-[0.66rem] text-muted-foreground">{p.codigo}</span>
                    {p.nome}
                  </p>
                  <p className="truncate text-[0.66rem] text-muted-foreground">{p.metodo}</p>
                </div>

                {ensaio ? (
                  <div className="flex shrink-0 items-center gap-2">
                    <Pilula
                      tom={ensaio.status === 'pendente' ? 'neutro' : 'info'}
                      className="px-1.5 py-0 text-[0.6rem]"
                    >
                      {ensaio.status}
                    </Pilula>
                    {ensaio.status === 'pendente' && (
                      <Button size="sm" variant="ghost" className="h-7 text-[0.7rem]" onClick={() => retirar(ensaio.id)}>
                        Retirar
                      </Button>
                    )}
                  </div>
                ) : (
                  <span className="shrink-0 text-[0.66rem] text-muted-foreground">fora do escopo</span>
                )}
              </li>
            );
          })}
        </ul>

        <DialogFooter>
          <Button variant="outline" onClick={aoFechar}>Fechar</Button>
          <Button onClick={confirmar} disabled={aIncluir.length === 0}>
            Incluir {aIncluir.length > 0 && `(${aIncluir.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Cancelar ---------------- */

function DialogoCancelar({ amostra, aoFechar }: { amostra: Amostra; aoFechar: () => void }) {
  const { cancelarAmostra } = useAcoes();
  const [motivo, setMotivo] = useState('');

  const confirmar = () => {
    if (motivo.trim().length < 8) {
      toast.error('Descreva o motivo do cancelamento.');
      return;
    }
    cancelarAmostra(amostra.id, motivo.trim());
    toast.success(`${amostra.protocolo} cancelada.`);
    aoFechar();
  };

  return (
    <Dialog open onOpenChange={(a) => { if (!a) aoFechar(); }}>
      <DialogContent className="bancada sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancelar <span className="num">{amostra.protocolo}</span></DialogTitle>
          <DialogDescription>
            A amostra continua no acervo com todo o histórico — ela sai da fila da bancada
            e não entra em laudo. O motivo vai para a trilha de auditoria.
          </DialogDescription>
        </DialogHeader>

        <div>
          <Label className="label-micro mb-2 block" htmlFor="motivo-cancel">Motivo</Label>
          <Textarea
            id="motivo-cancel" rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ex.: massa insuficiente para o escopo; cliente autorizou descarte por e-mail."
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={aoFechar}>Voltar</Button>
          <Button variant="destructive" onClick={confirmar}>Cancelar amostra</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

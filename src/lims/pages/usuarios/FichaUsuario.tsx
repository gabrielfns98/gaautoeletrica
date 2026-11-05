/* ============================================================
   BANCADA — ficha do usuário (criar e editar)

   Sem isto um sistema recém-instalado tinha um único usuário, o
   administrador, e nenhuma forma de cadastrar a equipe: não havia
   como ter um analista, e a parte do sistema que mais importa — a
   bancada — não tinha quem a operasse.

   O que a ficha pede é o que o resto do sistema usa:
   - o papel decide o que a pessoa vê e faz;
   - as habilitações dizem em quais análises ela pode lançar;
   - o registro no conselho é o que sai sob a assinatura do laudo,
     e por isso é obrigatório para quem assina.
   ============================================================ */

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

import { iniciais } from '../../lib/format';
import type { GrupoAnalise, GrupoAnaliseId, Papel, Usuario } from '../../types';

/* O administrador tem todas as permissões por ser papel de gestão
   do sistema, não por fazer bancada. Exigir dele CRQ e habilitação
   travaria a edição do único usuário de uma instalação nova. */
const ehGestao = (papel: Papel | undefined) => papel?.id === 'papel-admin';

/** Quem pode aprovar resultado assina laudo, e laudo exige registro. */
const assina = (papel: Papel | undefined) =>
  !ehGestao(papel) && (papel?.permissoes.includes('analises:aprovar') ?? false);

/** Quem lança resultado precisa estar habilitado em ao menos um grupo. */
const lanca = (papel: Papel | undefined) =>
  !ehGestao(papel) && (papel?.permissoes.includes('analises:editar') ?? false);

export function usuarioEmBranco(unidadeId: string, papelId: string): Usuario {
  return {
    id: `usr-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    nome: '',
    email: '',
    cargo: '',
    papelId,
    unidadeIds: [unidadeId],
    ativo: true,
    iniciais: '',
    habilitacoes: [],
    mfa: false,
  };
}

/**
 * O que impede salvar. Devolve a primeira coisa a corrigir, na
 * ordem em que aparece no formulário.
 */
export function conferirUsuario(
  u: Usuario, papel: Papel | undefined, outros: Usuario[],
): string | undefined {
  if (!u.nome.trim()) return 'Informe o nome.';
  if (!u.email.trim()) return 'Informe o e-mail: é por ele que a pessoa entra.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(u.email.trim())) return 'O e-mail não parece válido.';
  const repetido = outros.find(
    (x) => x.id !== u.id && x.email.trim().toLowerCase() === u.email.trim().toLowerCase(),
  );
  if (repetido) return `Este e-mail já é de ${repetido.nome}.`;
  if (!papel) return 'Escolha o papel.';
  if (lanca(papel) && u.habilitacoes.length === 0) {
    return 'Quem lança resultado precisa de ao menos uma análise em que esteja habilitado.';
  }
  if (assina(papel) && !u.crq?.trim()) {
    return 'Quem aprova resultado assina laudo, e o laudo imprime o registro no conselho.';
  }
  return undefined;
}

export function FichaUsuario({
  aberto, usuario, novo, papeis, grupos, outros, aoFechar, aoSalvar,
}: {
  aberto: boolean;
  usuario: Usuario | null;
  novo: boolean;
  papeis: Papel[];
  grupos: GrupoAnalise[];
  outros: Usuario[];
  aoFechar: () => void;
  aoSalvar: (u: Usuario) => void;
}) {
  const [rascunho, setRascunho] = useState<Usuario | null>(usuario);
  useEffect(() => { setRascunho(usuario); }, [usuario]);

  if (!rascunho) return null;

  const papel = papeis.find((p) => p.id === rascunho.papelId);
  const erro = conferirUsuario(rascunho, papel, outros);
  const mudar = (parcial: Partial<Usuario>) => setRascunho({ ...rascunho, ...parcial });

  const alternarGrupo = (id: GrupoAnaliseId, marcado: boolean) =>
    mudar({
      habilitacoes: marcado
        ? [...rascunho.habilitacoes, id]
        : rascunho.habilitacoes.filter((g) => g !== id),
    });

  return (
    <Dialog open={aberto} onOpenChange={(a) => { if (!a) aoFechar(); }}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{novo ? 'Novo usuário' : `Editar — ${rascunho.nome}`}</DialogTitle>
          <DialogDescription>
            O papel decide o que a pessoa vê e faz. As habilitações dizem em quais análises
            ela pode lançar resultado.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="u-nome">Nome completo</Label>
            <Input id="u-nome" value={rascunho.nome} onChange={(e) => mudar({ nome: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="u-email">E-mail</Label>
            <Input id="u-email" type="email" value={rascunho.email} onChange={(e) => mudar({ email: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="u-cargo">Cargo</Label>
            <Input id="u-cargo" value={rascunho.cargo} onChange={(e) => mudar({ cargo: e.target.value })} placeholder="Analista de bancada" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="u-papel">Papel</Label>
            <Select value={rascunho.papelId} onValueChange={(v) => mudar({ papelId: v })}>
              <SelectTrigger id="u-papel" aria-label="Papel"><SelectValue /></SelectTrigger>
              <SelectContent>
                {papeis.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            {papel && <p className="text-xs text-muted-foreground">{papel.descricao}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="u-crq">
              Registro no conselho {assina(papel) ? '' : <span className="text-muted-foreground">(se assina laudo)</span>}
            </Label>
            <Input id="u-crq" value={rascunho.crq ?? ''} onChange={(e) => mudar({ crq: e.target.value || undefined })} placeholder="CRQ IV 04123456" />
          </div>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">
            Habilitações {lanca(papel) ? '' : <span className="font-normal text-muted-foreground">(só para quem lança resultado)</span>}
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {grupos.filter((g) => g.ativo).map((g) => {
              const marcado = rascunho.habilitacoes.includes(g.id);
              return (
                <label key={g.id} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={marcado} onCheckedChange={(v) => alternarGrupo(g.id, v === true)} aria-label={`Habilitado em ${g.nome}`} />
                  {g.nome}
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={rascunho.mfa} onCheckedChange={(v) => mudar({ mfa: v })} aria-label="Exigir segundo fator" />
            Exigir segundo fator
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={rascunho.ativo} onCheckedChange={(v) => mudar({ ativo: v })} aria-label="Usuário ativo" />
            Ativo
          </label>
        </div>

        {erro && (
          <p role="alert" className="rounded-[var(--radius-sm)] bg-destructive/10 px-3 py-2 text-xs text-destructive">{erro}</p>
        )}

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={aoFechar}>Cancelar</Button>
          <Button
            disabled={Boolean(erro)}
            onClick={() => aoSalvar({
              ...rascunho,
              nome: rascunho.nome.trim(),
              email: rascunho.email.trim(),
              iniciais: iniciais(rascunho.nome),
              // Habilitação de quem não lança não significa nada; não fica guardada.
              habilitacoes: lanca(papel) || ehGestao(papel) ? rascunho.habilitacoes : [],
            })}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================
   BANCADA — telas de acesso do modo banco
   Entrada, espera e falha de carga. São as únicas telas que
   aparecem antes de existir estado, então não dependem da store.
   ============================================================ */

import { useState } from 'react';
import { FlaskConical, Loader2, TriangleAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { exigirBanco } from '../data/supabase';

function Moldura({ children }: { children: React.ReactNode }) {
  return (
    <div className="bancada flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}

function Marca() {
  return (
    <div className="mb-8 flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-[var(--radius)] bg-primary/15 text-primary">
        <FlaskConical className="h-5 w-5" />
      </span>
      <div>
        <p className="font-display text-xl leading-none tracking-tight">Bancada</p>
        <p className="label-micro mt-1">Gestão laboratorial</p>
      </div>
    </div>
  );
}

export function Entrar() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const submeter = async (evento: React.FormEvent) => {
    evento.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      const { error } = await exigirBanco().auth.signInWithPassword({ email, password: senha });
      if (error) {
        setErro(error.message === 'Invalid login credentials'
          ? 'E-mail ou senha incorretos.'
          : error.message);
      }
      // O provedor observa a sessão: entrar com sucesso troca a tela sozinho.
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Moldura>
      <Marca />
      <form onSubmit={submeter} className="space-y-4 rounded-[var(--radius-lg)] border border-border bg-card p-6">
        <div className="space-y-2">
          <Label htmlFor="acesso-email">E-mail</Label>
          <Input
            id="acesso-email" type="email" autoComplete="username" required
            value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="analista@laboratorio.com.br"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="acesso-senha">Senha</Label>
          <Input
            id="acesso-senha" type="password" autoComplete="current-password" required
            value={senha} onChange={(e) => setSenha(e.target.value)}
          />
        </div>

        {erro && (
          <p role="alert" className="rounded-[var(--radius-sm)] bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {erro}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={enviando}>
          {enviando && <Loader2 className="h-4 w-4 animate-spin" />}
          {enviando ? 'Entrando…' : 'Entrar'}
        </Button>

        <p className="text-xs leading-relaxed text-muted-foreground">
          O acesso é criado pelo administrador do laboratório. Cada conta responde
          por um papel, e o papel decide o que aparece no menu.
        </p>
      </form>
    </Moldura>
  );
}

export function Carregando({ mensagem = 'Carregando a bancada…' }: { mensagem?: string }) {
  return (
    <Moldura>
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm">{mensagem}</p>
      </div>
    </Moldura>
  );
}

export function FalhaCarga({ erro, aoTentar, aoSair }: {
  erro: string; aoTentar: () => void; aoSair: () => void;
}) {
  return (
    <Moldura>
      <Marca />
      <div className="space-y-4 rounded-[var(--radius-lg)] border border-destructive/40 bg-card p-6">
        <div className="flex items-center gap-2 text-destructive">
          <TriangleAlert className="h-5 w-5" />
          <p className="font-medium">Não foi possível carregar</p>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">{erro}</p>
        <div className="flex gap-2">
          <Button onClick={aoTentar} className="flex-1">Tentar de novo</Button>
          <Button variant="outline" onClick={aoSair}>Sair</Button>
        </div>
      </div>
    </Moldura>
  );
}

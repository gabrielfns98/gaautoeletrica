import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Field from "@/components/app/Field";
import Logo from "@/components/app/Logo";

/* SCREEN 1b — Acesso.
   Objetivo: entrar. Erro diz o que houve e o que fazer; o foco vai até ele. */

/** Traduz o erro do Supabase para algo que diga o que fazer. */
function mensagemDeErro(bruto: string): string {
  const m = bruto.toLowerCase();
  if (m.includes("invalid login credentials"))
    return "E-mail ou senha não conferem. Confira os dois e tente de novo.";
  if (m.includes("email not confirmed"))
    return "Confirme o e-mail pelo link que enviamos antes de entrar.";
  if (m.includes("user already registered"))
    return "Este e-mail já tem conta. Use a aba Entrar.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Muitas tentativas seguidas. Espere um minuto e tente novamente.";
  if (m.includes("failed to fetch") || m.includes("network"))
    return "Sem conexão com o servidor. Verifique a internet e tente de novo.";
  return bruto;
}

const Entrar = () => {
  const { user, loading, signIn, signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [aba, setAba] = useState("entrar");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [erroSenha, setErroSenha] = useState<string | null>(null);

  const [acesso, setAcesso] = useState({ email: "", senha: "" });
  const [cadastro, setCadastro] = useState({ email: "", senha: "", confirmacao: "" });

  const alertaRef = useRef<HTMLDivElement>(null);

  // Erro de formulário não adianta se o leitor de tela não chega até ele.
  useEffect(() => {
    if (erro) alertaRef.current?.focus();
  }, [erro]);

  if (loading) {
    return (
      <div className="surface-ink flex min-h-screen items-center justify-center bg-background">
        <p className="text-small text-white/70">Carregando…</p>
      </div>
    );
  }

  if (user) return <Navigate to="/painel" replace />;

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    const { error } = await signIn(acesso.email.trim(), acesso.senha);
    setEnviando(false);
    if (error) {
      setErro(mensagemDeErro(error.message ?? ""));
      return;
    }
    navigate("/painel", { replace: true });
  };

  const criarConta = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setErroSenha(null);

    if (cadastro.senha.length < 6) {
      setErroSenha("Use pelo menos 6 caracteres.");
      return;
    }
    if (cadastro.senha !== cadastro.confirmacao) {
      setErroSenha("As duas senhas estão diferentes. Digite de novo.");
      return;
    }

    setEnviando(true);
    const { error } = await signUp(cadastro.email.trim(), cadastro.senha);
    setEnviando(false);

    if (error) {
      setErro(mensagemDeErro(error.message ?? ""));
      return;
    }
    toast({
      title: "Conta criada",
      description: "Agora é só entrar com esse e-mail e senha.",
    });
    setAba("entrar");
    setAcesso({ email: cadastro.email.trim(), senha: "" });
  };

  return (
    <div className="surface-ink flex min-h-screen flex-col bg-background">
      <div className="container flex h-16 shrink-0 items-center justify-between">
        <Link to="/" className="rounded-sm" aria-label="G.A Auto Elétrica — início">
          <Logo />
        </Link>
        <Button variant="ghost" asChild className="text-white hover:bg-white/10 hover:text-white">
          <Link to="/">
            <ArrowLeft size={16} aria-hidden="true" />
            Voltar
          </Link>
        </Button>
      </div>

      <main className="container flex flex-1 items-center justify-center py-10">
        <div className="w-full max-w-[400px]">
          <h1 className="text-display-m text-white">Acesse sua conta</h1>
          <p className="mt-1 text-small text-white/65">
            É aqui que você abre ordens e acompanha o serviço do seu carro.
          </p>

          <div className="mt-6 rounded-xl bg-card p-5 text-card-foreground shadow-overlay sm:p-6">
            {erro && (
              <div
                ref={alertaRef}
                tabIndex={-1}
                role="alert"
                className="mb-5 flex items-start gap-2 rounded-sm border border-destructive/40 bg-destructive/10 p-3 text-small text-destructive"
              >
                <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                {erro}
              </div>
            )}

            <Tabs value={aba} onValueChange={(v) => { setAba(v); setErro(null); setErroSenha(null); }}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="entrar">Entrar</TabsTrigger>
                <TabsTrigger value="criar">Criar conta</TabsTrigger>
              </TabsList>

              <TabsContent value="entrar" className="mt-5">
                <form onSubmit={entrar} className="space-y-4" noValidate>
                  <Field rotulo="E-mail" obrigatorio>
                    {(p) => (
                      <Input
                        {...p}
                        type="email"
                        autoComplete="email"
                        placeholder="voce@email.com"
                        value={acesso.email}
                        onChange={(e) => setAcesso((s) => ({ ...s, email: e.target.value }))}
                        required
                      />
                    )}
                  </Field>

                  <Field rotulo="Senha" obrigatorio>
                    {(p) => (
                      <Input
                        {...p}
                        type="password"
                        autoComplete="current-password"
                        value={acesso.senha}
                        onChange={(e) => setAcesso((s) => ({ ...s, senha: e.target.value }))}
                        required
                      />
                    )}
                  </Field>

                  <Button type="submit" className="w-full" disabled={enviando}>
                    {enviando ? "Entrando…" : "Entrar"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="criar" className="mt-5">
                <form onSubmit={criarConta} className="space-y-4" noValidate>
                  <Field rotulo="E-mail" obrigatorio>
                    {(p) => (
                      <Input
                        {...p}
                        type="email"
                        autoComplete="email"
                        placeholder="voce@email.com"
                        value={cadastro.email}
                        onChange={(e) => setCadastro((s) => ({ ...s, email: e.target.value }))}
                        required
                      />
                    )}
                  </Field>

                  <Field rotulo="Senha" dica="No mínimo 6 caracteres." erro={erroSenha} obrigatorio>
                    {(p) => (
                      <Input
                        {...p}
                        type="password"
                        autoComplete="new-password"
                        value={cadastro.senha}
                        onChange={(e) => setCadastro((s) => ({ ...s, senha: e.target.value }))}
                        required
                      />
                    )}
                  </Field>

                  <Field rotulo="Repita a senha" obrigatorio>
                    {(p) => (
                      <Input
                        {...p}
                        type="password"
                        autoComplete="new-password"
                        value={cadastro.confirmacao}
                        onChange={(e) => setCadastro((s) => ({ ...s, confirmacao: e.target.value }))}
                        required
                      />
                    )}
                  </Field>

                  <Button type="submit" className="w-full" disabled={enviando}>
                    {enviando ? "Criando conta…" : "Criar conta"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Entrar;

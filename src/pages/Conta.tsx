import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, Car, LogOut, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import AppShell from "@/components/app/AppShell";
import EmptyState from "@/components/app/EmptyState";
import Field from "@/components/app/Field";
import PageHeader from "@/components/app/PageHeader";
import { usePerfil, useSalvarPerfil, useVeiculos } from "@/hooks/useOficina";
import { cn } from "@/lib/utils";

/* SCREEN 5 — Conta.
   Objetivo: corrigir o telefone, ver os carros, sair.
   Cada bloco salva sozinho: se um falhar, os outros continuam funcionando. */

const Bloco = ({
  titulo,
  descricao,
  children,
  salvo,
}: {
  titulo: string;
  descricao?: string;
  children: React.ReactNode;
  salvo?: boolean;
}) => (
  <section
    className={cn(
      "rounded-xl border bg-card p-5 shadow-raised transition-colors duration-slow sm:p-6",
      salvo ? "border-success" : "border-border",
    )}
  >
    <h2 className="text-title text-foreground">{titulo}</h2>
    {descricao && <p className="mt-1 text-small text-muted-foreground">{descricao}</p>}
    <div className="mt-5">{children}</div>
  </section>
);

const Conta = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const perfil = usePerfil();
  const veiculos = useVeiculos();
  const salvar = useSalvarPerfil();

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    if (perfil.data) {
      setNome(perfil.data.full_name ?? "");
      setTelefone(perfil.data.phone ?? "");
    }
  }, [perfil.data]);

  useEffect(() => {
    if (!salvo) return;
    const t = setTimeout(() => setSalvo(false), 2000);
    return () => clearTimeout(t);
  }, [salvo]);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (!nome.trim()) {
      setErro("Informe seu nome — é como a oficina te identifica na bancada.");
      return;
    }

    try {
      await salvar.mutateAsync({ full_name: nome.trim(), phone: telefone.trim() });
      setSalvo(true);
      toast({ title: "Dados salvos" });
    } catch {
      setErro("Não consegui salvar agora. Verifique a conexão e tente de novo.");
    }
  };

  const sair = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  return (
    <AppShell largura="estreito">
      <PageHeader titulo="Conta e veículos" descricao="Seus dados e os carros cadastrados." />

      <div className="space-y-6">
        <Bloco
          titulo="Seus dados"
          descricao="É por aqui que a oficina te avisa quando o carro fica pronto."
          salvo={salvo}
        >
          {perfil.isLoading ? (
            <div className="space-y-4" aria-busy="true">
              <Skeleton className="h-[72px] w-full rounded-sm" />
              <Skeleton className="h-[72px] w-full rounded-sm" />
            </div>
          ) : (
            <form onSubmit={enviar} className="space-y-4" noValidate>
              {erro && (
                <p role="alert" className="flex items-start gap-2 text-small text-destructive">
                  <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
                  {erro}
                </p>
              )}

              <Field rotulo="Nome completo" obrigatorio>
                {(p) => (
                  <Input
                    {...p}
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    autoComplete="name"
                    placeholder="Como quer ser chamado"
                    aria-invalid={Boolean(erro)}
                    disabled={salvar.isPending}
                  />
                )}
              </Field>

              <Field rotulo="Telefone / WhatsApp" dica="Com DDD. Ex.: (34) 9 9999-0000.">
                {(p) => (
                  <Input
                    {...p}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="(34) 9 9999-0000"
                    disabled={salvar.isPending}
                  />
                )}
              </Field>

              <Field rotulo="E-mail de acesso">
                {(p) => <Input {...p} value={user?.email ?? ""} disabled readOnly />}
              </Field>

              <Button type="submit" disabled={salvar.isPending}>
                {salvar.isPending ? "Salvando…" : "Salvar dados"}
              </Button>
            </form>
          )}
        </Bloco>

        <Bloco titulo="Seus veículos">
          {veiculos.isLoading ? (
            <Skeleton className="h-20 w-full rounded-sm" aria-busy="true" />
          ) : (veiculos.data?.length ?? 0) === 0 ? (
            <EmptyState
              icone={Car}
              titulo="Nenhum veículo cadastrado"
              descricao="O carro é cadastrado junto com a primeira ordem de serviço."
              acao={
                <Button asChild>
                  <Link to="/painel/nova">
                    <Plus size={16} aria-hidden="true" />
                    Cadastrar veículo
                  </Link>
                </Button>
              }
            />
          ) : (
            <>
              <ul className="divide-y divide-border">
                {veiculos.data?.map((v) => (
                  <li key={v.id} className="flex items-center gap-4 py-3 first:pt-0">
                    <span className="plate shrink-0">{v.plate}</span>
                    <span className="min-w-0 flex-1 truncate text-small text-foreground">
                      {v.brand} {v.model}
                      {v.year && (
                        <span className="text-muted-foreground"> · {v.year}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              <Button variant="outline" asChild className="mt-5 w-full sm:w-auto">
                <Link to="/painel/nova">
                  <Plus size={16} aria-hidden="true" />
                  Adicionar outro veículo
                </Link>
              </Button>
            </>
          )}
        </Bloco>

        <Bloco titulo="Sessão" descricao="Você sai apenas deste aparelho. Seus dados continuam salvos.">
          <Button variant="outline" onClick={sair}>
            <LogOut size={16} aria-hidden="true" />
            Sair da conta
          </Button>
        </Bloco>
      </div>
    </AppShell>
  );
};

export default Conta;

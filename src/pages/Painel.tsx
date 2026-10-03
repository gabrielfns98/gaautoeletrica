import { Link } from "react-router-dom";
import { Car, ChevronRight, Plus, RotateCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import AppShell from "@/components/app/AppShell";
import EmptyState from "@/components/app/EmptyState";
import PageHeader from "@/components/app/PageHeader";
import StatusBadge from "@/components/app/StatusBadge";
import { useOrdens, useVeiculos, type Ordem } from "@/hooks/useOficina";
import { codigoDaOrdem, formatarData } from "@/lib/ordens";

/* SCREEN 2 — Painel.
   Objetivo: ver de relance se tem algo acontecendo com o carro.
   Em aberto primeiro (em andamento no topo), concluídas depois. */

const PESO = { in_progress: 0, pending: 1, completed: 2, cancelled: 3 } as const;

function ordenar(ordens: Ordem[]): Ordem[] {
  return [...ordens].sort((a, b) => {
    const pa = PESO[a.status as keyof typeof PESO] ?? 9;
    const pb = PESO[b.status as keyof typeof PESO] ?? 9;
    if (pa !== pb) return pa - pb;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

const LinhaDaOrdem = ({ ordem, atraso }: { ordem: Ordem; atraso: number }) => (
  <li className="animate-fade-up" style={{ animationDelay: `${atraso}ms` }}>
    <Link
      to={`/painel/os/${ordem.id}`}
      className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-raised transition-shadow duration-fast hover:shadow-overlay sm:p-5"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="plate">{ordem.vehicles?.plate ?? "SEM PLACA"}</span>
          <StatusBadge status={ordem.status} />
        </div>

        <p className="mt-2 truncate text-title text-foreground">{ordem.service_type}</p>

        <p className="mt-0.5 truncate text-small text-muted-foreground">
          {ordem.vehicles ? `${ordem.vehicles.brand} ${ordem.vehicles.model}` : "Veículo removido"}
          {" · "}
          {codigoDaOrdem(ordem.id)}
          {" · aberta em "}
          {formatarData(ordem.created_at)}
        </p>
      </div>

      <ChevronRight
        size={20}
        aria-hidden="true"
        className="shrink-0 text-muted-foreground transition-transform duration-fast group-hover:translate-x-0.5"
      />
    </Link>
  </li>
);

const Painel = () => {
  const veiculos = useVeiculos();
  const ordens = useOrdens();

  const carregando = veiculos.isLoading || ordens.isLoading;
  const falhou = veiculos.isError || ordens.isError;
  const lista = ordens.data ? ordenar(ordens.data) : [];

  const emAberto = lista.filter((o) => o.status === "pending" || o.status === "in_progress");
  const encerradas = lista.filter((o) => o.status === "completed" || o.status === "cancelled");
  const semVeiculo = (veiculos.data?.length ?? 0) === 0;

  const recarregar = () => {
    veiculos.refetch();
    ordens.refetch();
  };

  return (
    <AppShell>
      <PageHeader
        titulo="Seus serviços"
        descricao={
          emAberto.length > 0
            ? `${emAberto.length} ${emAberto.length === 1 ? "ordem em aberto" : "ordens em aberto"}.`
            : "Nenhuma ordem em aberto agora."
        }
        acao={
          !carregando &&
          !falhou && (
            <Button asChild className="w-full sm:w-auto">
              <Link to="/painel/nova">
                <Plus size={16} aria-hidden="true" />
                Abrir ordem
              </Link>
            </Button>
          )
        }
      />

      {/* loading — a altura do skeleton é a altura real da linha, para a lista não pular */}
      {carregando && (
        <ul className="space-y-3" aria-busy="true" aria-label="Carregando suas ordens">
          {[0, 1, 2].map((i) => (
            <li key={i}>
              <Skeleton className="h-[104px] w-full rounded-xl" />
            </li>
          ))}
        </ul>
      )}

      {/* error */}
      {!carregando && falhou && (
        <EmptyState
          icone={WifiOff}
          titulo="Não consegui carregar suas ordens"
          descricao="Pode ter sido a conexão. Tente de novo — nada do que você enviou se perdeu."
          acao={
            <Button onClick={recarregar}>
              <RotateCw size={16} aria-hidden="true" />
              Tentar de novo
            </Button>
          }
        />
      )}

      {/* empty — dois níveis: sem veículo é um problema diferente de sem ordem */}
      {!carregando && !falhou && lista.length === 0 && (
        semVeiculo ? (
          <EmptyState
            icone={Car}
            titulo="Cadastre seu carro"
            descricao="Com a placa e o modelo salvos, abrir uma ordem leva 30 segundos."
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
          <EmptyState
            icone={Car}
            titulo="Nenhum serviço em aberto"
            descricao="Quando você abrir uma ordem, o andamento aparece aqui com data em cada etapa."
            acao={
              <Button asChild>
                <Link to="/painel/nova">
                  <Plus size={16} aria-hidden="true" />
                  Abrir ordem
                </Link>
              </Button>
            }
          />
        )
      )}

      {/* success */}
      {!carregando && !falhou && lista.length > 0 && (
        <div className="space-y-10">
          {emAberto.length > 0 && (
            <section aria-labelledby="titulo-aberto">
              <h2 id="titulo-aberto" className="mb-3 text-caption text-muted-foreground">
                EM ABERTO
              </h2>
              <ul className="space-y-3">
                {emAberto.map((o, i) => (
                  <LinhaDaOrdem key={o.id} ordem={o} atraso={i * 40} />
                ))}
              </ul>
            </section>
          )}

          {encerradas.length > 0 && (
            <section aria-labelledby="titulo-encerrado">
              <h2 id="titulo-encerrado" className="mb-3 text-caption text-muted-foreground">
                HISTÓRICO
              </h2>
              <ul className="space-y-3">
                {encerradas.map((o, i) => (
                  <LinhaDaOrdem key={o.id} ordem={o} atraso={i * 40} />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </AppShell>
  );
};

export default Painel;

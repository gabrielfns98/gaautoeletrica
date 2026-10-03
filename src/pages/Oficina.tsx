import { useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardList, Lock, RotateCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/hooks/useAdmin";
import AppShell from "@/components/app/AppShell";
import EmptyState from "@/components/app/EmptyState";
import PageHeader from "@/components/app/PageHeader";
import StatusBadge from "@/components/app/StatusBadge";
import { useAtualizarStatus, useFilaDaOficina } from "@/hooks/useOficina";
import { STATUS, codigoDaOrdem, formatarData } from "@/lib/ordens";

/* Área interna da oficina.
   Antes vivia na home pública, mostrando "Acesso negado" para todo visitante. */

const FILTROS = [
  { chave: "abertas", rotulo: "Em aberto" },
  { chave: "todas", rotulo: "Todas" },
] as const;

const Oficina = () => {
  const { isAdmin, loading: verificando } = useAdmin();
  const { toast } = useToast();
  const fila = useFilaDaOficina(isAdmin);
  const atualizar = useAtualizarStatus();
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]["chave"]>("abertas");

  const mudarStatus = async (id: string, status: string) => {
    try {
      await atualizar.mutateAsync({ id, status });
      toast({ title: "Status atualizado", description: `A ordem agora está "${STATUS[status as keyof typeof STATUS].rotulo}".` });
    } catch {
      toast({
        variant: "destructive",
        title: "Não consegui atualizar",
        description: "Verifique a conexão e tente de novo. A ordem não foi alterada.",
      });
    }
  };

  if (verificando) {
    return (
      <AppShell>
        <Skeleton className="h-10 w-64 rounded-sm" aria-busy="true" />
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell>
        <EmptyState
          icone={Lock}
          titulo="Esta área é da equipe da oficina"
          descricao="Sua conta é de cliente. Suas ordens de serviço ficam no painel."
          acao={
            <Button asChild>
              <Link to="/painel">Ir para meu painel</Link>
            </Button>
          }
        />
      </AppShell>
    );
  }

  const todas = fila.data ?? [];
  const lista =
    filtro === "abertas"
      ? todas.filter((o) => o.status === "pending" || o.status === "in_progress")
      : todas;

  return (
    <AppShell>
      <PageHeader
        titulo="Fila da oficina"
        descricao="Mude o status e o cliente vê a alteração no painel dele."
        acao={
          <div className="flex gap-1 rounded-sm bg-muted p-1" role="tablist" aria-label="Filtrar ordens">
            {FILTROS.map((f) => (
              <button
                key={f.chave}
                role="tab"
                aria-selected={filtro === f.chave}
                onClick={() => setFiltro(f.chave)}
                className={
                  filtro === f.chave
                    ? "rounded-sm bg-card px-3 py-1.5 text-small font-medium text-foreground shadow-raised"
                    : "rounded-sm px-3 py-1.5 text-small text-muted-foreground transition-colors duration-fast hover:text-foreground"
                }
              >
                {f.rotulo}
              </button>
            ))}
          </div>
        }
      />

      {fila.isLoading && (
        <ul className="space-y-3" aria-busy="true" aria-label="Carregando a fila">
          {[0, 1, 2].map((i) => (
            <li key={i}>
              <Skeleton className="h-[120px] w-full rounded-xl" />
            </li>
          ))}
        </ul>
      )}

      {!fila.isLoading && fila.isError && (
        <EmptyState
          icone={WifiOff}
          titulo="Não consegui carregar a fila"
          descricao="Nenhuma ordem foi alterada. Tente de novo."
          acao={
            <Button onClick={() => fila.refetch()}>
              <RotateCw size={16} aria-hidden="true" />
              Tentar de novo
            </Button>
          }
        />
      )}

      {!fila.isLoading && !fila.isError && lista.length === 0 && (
        <EmptyState
          icone={ClipboardList}
          titulo={filtro === "abertas" ? "Nenhuma ordem em aberto" : "Nenhuma ordem registrada"}
          descricao={
            filtro === "abertas"
              ? "Bancada livre. As novas ordens aparecem aqui assim que os clientes abrem."
              : "As ordens abertas pelos clientes aparecem aqui."
          }
        />
      )}

      {!fila.isLoading && !fila.isError && lista.length > 0 && (
        <ul className="space-y-3">
          {lista.map((ordem, i) => (
            <li
              key={ordem.id}
              className="animate-fade-up rounded-xl border border-border bg-card p-4 shadow-raised sm:p-5"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="plate">{ordem.vehicles?.plate ?? "SEM PLACA"}</span>
                    <StatusBadge status={ordem.status} />
                  </div>

                  <p className="mt-2 text-title text-foreground">{ordem.service_type}</p>

                  <p className="mt-0.5 text-small text-muted-foreground">
                    {ordem.vehicles
                      ? `${ordem.vehicles.brand} ${ordem.vehicles.model}`
                      : "Veículo removido"}
                    {" · "}
                    {ordem.cliente ?? "Cliente não informado"}
                    {" · "}
                    {codigoDaOrdem(ordem.id)}
                  </p>

                  {ordem.description && (
                    <p className="mt-2 line-clamp-2 text-small text-foreground">
                      “{ordem.description}”
                    </p>
                  )}

                  <p className="mt-2 text-caption text-muted-foreground">
                    ABERTA EM {formatarData(ordem.created_at).toUpperCase()}
                    {ordem.scheduled_date &&
                      ` · ENTRADA PREVISTA ${formatarData(ordem.scheduled_date).toUpperCase()}`}
                  </p>
                </div>

                <div className="shrink-0 sm:w-48">
                  <label htmlFor={`status-${ordem.id}`} className="sr-only">
                    Status da ordem {codigoDaOrdem(ordem.id)}
                  </label>
                  <Select
                    value={ordem.status}
                    onValueChange={(v) => mudarStatus(ordem.id, v)}
                    disabled={atualizar.isPending}
                  >
                    <SelectTrigger id={`status-${ordem.id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS).map(([chave, info]) => (
                        <SelectItem key={chave} value={chave}>
                          {info.rotulo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
};

export default Oficina;

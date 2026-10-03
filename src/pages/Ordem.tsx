import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, FileQuestion, MessageCircle, RotateCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import AppShell from "@/components/app/AppShell";
import EmptyState from "@/components/app/EmptyState";
import StatusBadge from "@/components/app/StatusBadge";
import StatusTimeline from "@/components/app/StatusTimeline";
import { useOrdem } from "@/hooks/useOficina";
import { codigoDaOrdem, formatarData, formatarMoeda, statusDe } from "@/lib/ordens";
import { OFICINA, linkWhatsApp } from "@/config/contato";

/* SCREEN 4 — Acompanhamento.
   Objetivo: saber em que etapa está e quando fica pronto. */

const Voltar = () => (
  <Button variant="ghost" size="sm" asChild className="-ml-3 mb-3">
    <Link to="/painel">
      <ArrowLeft size={16} aria-hidden="true" />
      Voltar ao painel
    </Link>
  </Button>
);

const Ordem = () => {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const { data: ordem, isLoading, isError, refetch } = useOrdem(id);

  // Faixa de confirmação logo após criar a ordem. Some sozinha em 6s.
  const [mostrarFaixa, setMostrarFaixa] = useState(params.get("nova") === "1");
  useEffect(() => {
    if (!mostrarFaixa) return;
    const t = setTimeout(() => setMostrarFaixa(false), 6000);
    return () => clearTimeout(t);
  }, [mostrarFaixa]);

  if (isLoading) {
    return (
      <AppShell largura="estreito">
        <Voltar />
        <div className="space-y-6" aria-busy="true" aria-label="Carregando a ordem">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </AppShell>
    );
  }

  if (isError) {
    return (
      <AppShell largura="estreito">
        <Voltar />
        <EmptyState
          icone={WifiOff}
          titulo="Não consegui carregar esta ordem"
          descricao="Pode ter sido a conexão. O andamento do serviço continua registrado."
          acao={
            <Button onClick={() => refetch()}>
              <RotateCw size={16} aria-hidden="true" />
              Tentar de novo
            </Button>
          }
        />
      </AppShell>
    );
  }

  if (!ordem) {
    return (
      <AppShell largura="estreito">
        <Voltar />
        <EmptyState
          icone={FileQuestion}
          titulo="Essa ordem não existe ou não é sua"
          descricao="Confira o link. Suas ordens estão todas no painel."
          acao={
            <Button asChild>
              <Link to="/painel">Ver minhas ordens</Link>
            </Button>
          }
        />
      </AppShell>
    );
  }

  const info = statusDe(ordem.status);
  const codigo = codigoDaOrdem(ordem.id);
  const placa = ordem.vehicles?.plate ?? "sem placa";
  const custo = formatarMoeda(ordem.cost);
  const cancelada = ordem.status === "cancelled";
  const pronta = ordem.status === "completed";

  const mensagem = `Olá! Sobre a ordem ${codigo} do carro placa ${placa} (${ordem.service_type}).`;

  return (
    <AppShell largura="estreito">
      <Voltar />

      {mostrarFaixa && (
        <div
          role="status"
          className="mb-6 flex items-start gap-2 rounded-sm border border-success/40 bg-success/10 p-3 text-small text-foreground animate-fade-up"
        >
          <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
          Ordem aberta. A oficina já consegue ver seu pedido.
        </div>
      )}

      {/* Cabeçalho da ordem */}
      <header className="rounded-xl border border-border bg-card p-5 shadow-raised sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="plate">{placa}</span>
          <StatusBadge status={ordem.status} tamanho="lg" />
        </div>

        <h1 className="mt-3 text-display-m text-foreground">{ordem.service_type}</h1>

        <p className="mt-1 text-small text-muted-foreground">
          {ordem.vehicles
            ? `${ordem.vehicles.brand} ${ordem.vehicles.model}${ordem.vehicles.year ? ` · ${ordem.vehicles.year}` : ""}`
            : "Veículo removido"}
          {" · "}
          {codigo}
        </p>

        <p className="mt-4 text-body text-foreground">{info.resumo}</p>

        {pronta && (
          <p className="mt-1 text-small text-muted-foreground">
            Retirada {OFICINA.horario.dias.toLowerCase()}, {OFICINA.horario.faixa}.
          </p>
        )}

        {ordem.description && (
          <div className="mt-5 border-t border-border pt-4">
            <p className="text-caption text-muted-foreground">O QUE VOCÊ RELATOU</p>
            <p className="mt-1 whitespace-pre-line text-small text-foreground">{ordem.description}</p>
          </div>
        )}

        {(ordem.scheduled_date || custo) && (
          <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-4">
            {ordem.scheduled_date && (
              <div>
                <dt className="text-caption text-muted-foreground">PREVISÃO DE ENTRADA</dt>
                <dd className="mt-0.5 text-small text-foreground">
                  {formatarData(ordem.scheduled_date)}
                </dd>
              </div>
            )}
            {custo && (
              <div>
                <dt className="text-caption text-muted-foreground">VALOR</dt>
                <dd className="mt-0.5 text-title text-foreground">{custo}</dd>
              </div>
            )}
          </dl>
        )}
      </header>

      {/* Linha do tempo */}
      <section className="mt-6 rounded-xl border border-border bg-card p-5 shadow-raised sm:p-6">
        <h2 className="mb-5 text-caption text-muted-foreground">ANDAMENTO</h2>
        <StatusTimeline
          status={ordem.status}
          criadaEm={ordem.created_at}
          concluidaEm={ordem.completed_date}
        />
      </section>

      {/* Ações */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        {cancelada ? (
          <Button asChild className="sm:w-auto">
            <Link to="/painel/nova">Abrir nova ordem</Link>
          </Button>
        ) : (
          <Button variant="accent" asChild className="sm:w-auto">
            <a href={linkWhatsApp(mensagem)} target="_blank" rel="noreferrer">
              <MessageCircle size={16} aria-hidden="true" />
              Falar com a oficina
            </a>
          </Button>
        )}
        <Button variant="outline" asChild className="sm:w-auto">
          <Link to="/painel">Ver todas as ordens</Link>
        </Button>
      </div>
    </AppShell>
  );
};

export default Ordem;

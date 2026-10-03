import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { ETAPAS, etapaAtual, formatarDataHora } from "@/lib/ordens";

interface StatusTimelineProps {
  status: string;
  criadaEm?: string | null;
  concluidaEm?: string | null;
}

/**
 * Linha do tempo vertical de 4 etapas.
 * Feita = signal com check. Atual = volt pulsando. Futura = mist.
 * Cancelada troca a cor da etapa atual para alert e para a progressão.
 */
const StatusTimeline = ({ status, criadaEm, concluidaEm }: StatusTimelineProps) => {
  const cancelada = status === "cancelled";
  const atual = etapaAtual(status);

  return (
    <ol className="relative">
      {ETAPAS.map((etapa, i) => {
        const feita = !cancelada && i < atual;
        const agora = !cancelada && i === atual;
        const ultima = i === ETAPAS.length - 1;

        const carimbo =
          i === 0 ? formatarDataHora(criadaEm) : ultima && concluidaEm ? formatarDataHora(concluidaEm) : null;

        return (
          <li key={etapa.chave} className={cn("relative flex gap-4", !ultima && "pb-6")}>
            {/* Trilho */}
            {!ultima && (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute left-[11px] top-7 h-[calc(100%-1.75rem)] w-0.5 rounded-full",
                  feita ? "bg-success" : "bg-border",
                )}
              />
            )}

            {/* Marcador */}
            <span
              aria-hidden="true"
              className={cn(
                "relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2",
                feita && "border-success bg-success text-success-foreground",
                agora && "border-foreground bg-accent",
                cancelada && i === atual && "border-destructive bg-destructive",
                !feita && !agora && !(cancelada && i === atual) && "border-border bg-card",
              )}
            >
              {feita && <Check size={14} strokeWidth={3} />}
              {agora && <span className="h-2 w-2 animate-pulse-dot rounded-full bg-foreground" />}
            </span>

            <div className="min-w-0 pb-1">
              <p
                className={cn(
                  "text-small font-medium",
                  feita || agora ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {etapa.rotulo}
                {agora && <span className="sr-only"> — etapa atual</span>}
                {feita && <span className="sr-only"> — concluída</span>}
              </p>
              <p className="text-caption font-normal tracking-normal text-muted-foreground">
                {cancelada && i === atual ? "Interrompido." : etapa.descricao}
              </p>
              {carimbo && carimbo !== "—" && (
                <p className="mt-1 text-caption text-muted-foreground">{carimbo}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
};

export default StatusTimeline;

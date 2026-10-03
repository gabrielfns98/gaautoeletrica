import { cn } from "@/lib/utils";
import { statusDe } from "@/lib/ordens";

interface StatusBadgeProps {
  status: string;
  /** `lg` é usado no topo da tela de acompanhamento. */
  tamanho?: "sm" | "lg";
  className?: string;
}

/**
 * Chip de status. Não é interativo — sem hover, sem foco, sem clique.
 * A cor sozinha nunca carrega a informação: o rótulo sempre aparece.
 */
const StatusBadge = ({ status, tamanho = "sm", className }: StatusBadgeProps) => {
  const info = statusDe(status);
  const emAndamento = status === "in_progress";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-sm font-medium",
        tamanho === "sm" ? "px-2.5 py-1 text-caption" : "px-3 py-1.5 text-small",
        info.chip,
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full",
          info.ponto,
          emAndamento && "animate-pulse-dot",
        )}
      />
      {info.rotulo}
    </span>
  );
};

export default StatusBadge;

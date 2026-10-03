import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icone: LucideIcon;
  titulo: string;
  /** Uma frase. Convida para a ação — não pede desculpa. */
  descricao: string;
  acao?: React.ReactNode;
  className?: string;
}

const EmptyState = ({ icone: Icone, titulo, descricao, acao, className }: EmptyStateProps) => (
  <div
    className={cn(
      "flex flex-col items-center rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center",
      className,
    )}
  >
    <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
      <Icone size={22} aria-hidden="true" />
    </span>
    <h3 className="text-title text-foreground">{titulo}</h3>
    <p className="mt-1 max-w-sm text-small text-muted-foreground">{descricao}</p>
    {acao && <div className="mt-6">{acao}</div>}
  </div>
);

export default EmptyState;

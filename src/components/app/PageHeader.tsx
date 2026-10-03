import { cn } from "@/lib/utils";

interface PageHeaderProps {
  titulo: string;
  descricao?: string;
  /** Ação primária da tela. Uma só. */
  acao?: React.ReactNode;
  voltar?: React.ReactNode;
  className?: string;
}

const PageHeader = ({ titulo, descricao, acao, voltar, className }: PageHeaderProps) => (
  <header className={cn("mb-6", className)}>
    {voltar && <div className="mb-3">{voltar}</div>}
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-display-m text-foreground sm:text-display-l">{titulo}</h1>
        {descricao && <p className="mt-1 text-small text-muted-foreground">{descricao}</p>}
      </div>
      {acao && <div className="shrink-0">{acao}</div>}
    </div>
  </header>
);

export default PageHeader;

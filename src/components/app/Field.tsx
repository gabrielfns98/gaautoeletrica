import { useId } from "react";
import { AlertCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FieldProps {
  rotulo: string;
  /** Texto de apoio. Só quando o formato não é óbvio. */
  dica?: string;
  erro?: string | null;
  obrigatorio?: boolean;
  className?: string;
  children: (props: {
    id: string;
    "aria-invalid": boolean;
    "aria-describedby": string | undefined;
  }) => React.ReactNode;
}

/**
 * Envelope de campo: rótulo, dica, erro e a fiação de acessibilidade.
 * O erro diz o que houve e como resolver — nunca só "inválido".
 */
const Field = ({ rotulo, dica, erro, obrigatorio, className, children }: FieldProps) => {
  const id = useId();
  const idDica = dica ? `${id}-dica` : undefined;
  const idErro = erro ? `${id}-erro` : undefined;
  const describedBy = [idErro, idDica].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id} className="text-small font-medium text-foreground">
        {rotulo}
        {!obrigatorio && <span className="ml-1.5 font-normal text-muted-foreground">(opcional)</span>}
      </Label>

      {children({ id, "aria-invalid": Boolean(erro), "aria-describedby": describedBy })}

      {erro && (
        <p id={idErro} className="flex items-start gap-1.5 text-small text-destructive animate-fade-up">
          <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
          {erro}
        </p>
      )}
      {dica && !erro && (
        <p id={idDica} className="text-caption font-normal tracking-normal text-muted-foreground">
          {dica}
        </p>
      )}
    </div>
  );
};

export default Field;

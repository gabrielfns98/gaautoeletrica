import Link from "next/link";
import FormNovaEntrada from "./FormNovaEntrada";
import { BOTAO_FANTASMA } from "@/lib/ui";

export const metadata = { title: "Nova entrada" };

export default function NovaEntradaPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nova entrada</h1>
          <p className="text-sm text-slate-500">
            Digite a placa primeiro: se a van já veio aqui, o resto preenche sozinho.
          </p>
        </div>
        <Link href="/" className={BOTAO_FANTASMA}>
          Painel
        </Link>
      </div>
      <FormNovaEntrada />
    </div>
  );
}

import Link from "next/link";
import FormNovaEntrada from "./FormNovaEntrada";

export default function NovaEntradaPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Nova entrada</h1>
        <Link href="/" className="text-sm text-blue-700 underline">
          voltar ao painel
        </Link>
      </div>
      <FormNovaEntrada />
    </div>
  );
}

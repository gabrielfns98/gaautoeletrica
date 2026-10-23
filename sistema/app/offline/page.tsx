import { OFICINA } from "@/lib/oficina";

export const dynamic = "force-static";

export const metadata = { title: "Sem conexão" };

/**
 * Página guardada pelo service worker. O Chrome só oferece "instalar o app"
 * se o site responder alguma coisa sem internet, e é esta a resposta.
 */
export default function Offline() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-lg">
        <div
          className="mx-auto grid h-12 w-12 place-items-center rounded-xl text-xl font-black text-white"
          style={{ backgroundColor: OFICINA.corPrimaria }}
        >
          {OFICINA.nome.slice(0, 1).toUpperCase()}
        </div>
        <h1 className="mt-4 text-lg font-bold tracking-tight text-slate-900">Sem conexão</h1>
        <p className="mt-2 text-sm text-slate-600">
          O sistema precisa de internet para mostrar a fila e as OS. Assim que o sinal
          voltar, puxe a tela para baixo para recarregar.
        </p>
      </div>
    </div>
  );
}

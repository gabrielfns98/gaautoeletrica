import Link from "next/link";
import { OFICINA } from "@/lib/oficina";
import { requireUser } from "@/lib/auth";
import { lerLogo } from "@/lib/db";
import Navegacao from "./Navegacao";

export default async function SistemaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();
  const logo = await lerLogo();

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-3 pt-3 sm:px-4">
          <Link href="/" className="flex items-center gap-2">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logo}
                alt={OFICINA.nome}
                className="h-10 w-10 rounded-full bg-slate-900 object-contain p-0.5"
              />
            ) : (
              <span
                className="grid h-8 w-8 place-items-center rounded-lg text-sm font-black text-white"
                style={{ backgroundColor: OFICINA.corPrimaria }}
              >
                {OFICINA.nome.slice(0, 1).toUpperCase()}
              </span>
            )}
            <span className="text-base font-bold tracking-tight text-slate-900">
              {OFICINA.nome}
            </span>
          </Link>
          <form action="/api/sair" method="post">
            <button
              type="submit"
              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            >
              Sair
            </button>
          </form>
        </div>
        <Navegacao />
      </header>
      <main className="mx-auto max-w-4xl px-3 py-5 pb-24 sm:px-4">{children}</main>
    </>
  );
}

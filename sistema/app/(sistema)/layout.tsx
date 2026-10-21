import Link from "next/link";
import { OFICINA } from "@/lib/oficina";
import { requireUser } from "@/lib/auth";

export default async function SistemaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();

  return (
    <>
      <header
        className="sticky top-0 z-10 text-white shadow"
        style={{ backgroundColor: OFICINA.corPrimaria }}
      >
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-3 py-3 sm:px-4">
          <Link href="/" className="text-sm font-bold leading-tight sm:text-lg">
            {OFICINA.nome}
          </Link>
          <form action="/api/sair" method="post">
            <button
              type="submit"
              className="rounded border border-white/40 px-2 py-1 text-xs font-medium hover:bg-white/10"
            >
              Sair
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-3 py-4 pb-24 sm:px-4">{children}</main>
    </>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { OFICINA } from "@/lib/oficina";

const ABAS = [
  { href: "/", label: "Painel" },
  { href: "/financeiro", label: "Financeiro" },
  { href: "/historico", label: "Histórico" },
];

export default function Navegacao() {
  const caminho = usePathname();

  return (
    <nav className="mx-auto flex max-w-4xl gap-1 px-3 sm:px-4">
      {ABAS.map((aba) => {
        const ativa = aba.href === "/" ? caminho === "/" : caminho.startsWith(aba.href);
        return (
          <Link
            key={aba.href}
            href={aba.href}
            className={`-mb-px border-b-2 px-3 py-2.5 text-sm font-semibold transition ${
              ativa
                ? "text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
            style={ativa ? { borderColor: OFICINA.corPrimaria } : undefined}
          >
            {aba.label}
          </Link>
        );
      })}
    </nav>
  );
}

import type { Metadata, Viewport } from "next";
import "./globals.css";
import { OFICINA } from "@/lib/oficina";

export const metadata: Metadata = {
  title: `Oficina — ${OFICINA.nome}`,
  description: "Fila de trabalho, OS e orçamentos da oficina.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-slate-100 text-slate-900 antialiased">{children}</body>
    </html>
  );
}

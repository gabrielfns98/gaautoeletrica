import type { Metadata, Viewport } from "next";
import "./globals.css";
import { OFICINA } from "@/lib/oficina";
import RegistraSW from "./RegistraSW";

export const metadata: Metadata = {
  title: { default: OFICINA.nome, template: `%s — ${OFICINA.nome}` },
  description: "Fila de trabalho, OS e orçamentos da oficina.",
  manifest: "/manifest.webmanifest",
  applicationName: OFICINA.nome,
  appleWebApp: { capable: true, title: "Oficina", statusBarStyle: "default" },
  icons: { icon: "/api/icone", shortcut: "/api/icone", apple: "/api/icone" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: OFICINA.corPrimaria,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
        <RegistraSW />
      </body>
    </html>
  );
}

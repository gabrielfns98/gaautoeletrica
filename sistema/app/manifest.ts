import type { MetadataRoute } from "next";
import { OFICINA } from "@/lib/oficina";

/** Torna o sistema instalável no celular (PWA). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: OFICINA.nome,
    short_name: "Oficina",
    description: "Fila de trabalho, OS e orçamentos da oficina.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "pt-BR",
    background_color: "#f8fafc",
    theme_color: OFICINA.corPrimaria,
    icons: [
      { src: "/api/icone", sizes: "192x192", purpose: "any" },
      { src: "/api/icone", sizes: "512x512", purpose: "any" },
      { src: "/api/icone", sizes: "512x512", purpose: "maskable" },
    ],
  };
}

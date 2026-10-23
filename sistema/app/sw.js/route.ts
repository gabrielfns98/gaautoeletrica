export const dynamic = "force-static";

/**
 * Service worker mínimo: existe para o celular oferecer "instalar o app".
 * Não guarda nada em cache de propósito — os dados da oficina precisam ser
 * sempre os do servidor.
 */
export function GET() {
  const codigo = `
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (evento) => evento.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
`.trim();

  return new Response(codigo, {
    headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
      "Service-Worker-Allowed": "/",
    },
  });
}

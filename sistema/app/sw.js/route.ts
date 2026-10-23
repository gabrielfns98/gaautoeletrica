export const dynamic = "force-static";

/**
 * O Chrome no Android só oferece "Instalar app" se o site responder alguma
 * coisa sem internet — senão ele degrada para um atalho simples. Por isso o
 * service worker guarda a página /offline e devolve ela quando a navegação
 * falha. Nada além disso entra em cache: os dados da oficina têm que vir
 * sempre do servidor.
 */
export function GET() {
  const codigo = `
const CACHE = "oficina-offline-v1";
const PAGINA = "/offline";

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(new Request(PAGINA, { cache: "reload" })))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nomes) =>
        Promise.all(nomes.filter((nome) => nome !== CACHE).map((nome) => caches.delete(nome)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (evento) => {
  if (evento.request.mode !== "navigate") return;

  evento.respondWith(
    fetch(evento.request).catch(async () => {
      const cache = await caches.open(CACHE);
      const guardada = await cache.match(PAGINA);
      return guardada ?? Response.error();
    })
  );
});
`.trim();

  return new Response(codigo, {
    headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
      "Service-Worker-Allowed": "/",
    },
  });
}

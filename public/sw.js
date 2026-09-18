/* Service Worker mínimo: casca offline sem tocar em dados dinâmicos ou privados.
 * - Navegação: network-first com fallback para a home em modo offline.
 * - Estáticos (_next, fontes, imagens, worker do PDF): cache-first.
 * - NUNCA intercepta /api (buscas, sessão, progresso) nem cross-origin (PDFs das fontes).
 */
const VERSAO = "biblioteca-v1";
const NUCLEO = ["/", "/busca"];

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches
      .open(VERSAO)
      .then((cache) => cache.addAll(NUCLEO))
      .then(() => self.skipWaiting())
      .catch(() => undefined),
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((chaves) => Promise.all(chaves.filter((c) => c !== VERSAO).map((c) => caches.delete(c))))
      .then(() => self.clients.claim())
      .catch(() => undefined),
  );
});

function ehEstatico(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname === "/pdf.worker.min.mjs" ||
    /\.(?:js|css|woff2?|ttf|svg|png|jpg|jpeg|webp|ico)$/.test(url.pathname)
  );
}

self.addEventListener("fetch", (evento) => {
  const { request } = evento;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    evento.respondWith(
      fetch(request)
        .then((resposta) => {
          const copia = resposta.clone();
          caches.open(VERSAO).then((cache) => cache.put(request, copia)).catch(() => undefined);
          return resposta;
        })
        .catch(() => caches.match(request).then((cacheada) => cacheada || caches.match("/"))),
    );
    return;
  }

  if (ehEstatico(url)) {
    evento.respondWith(
      caches.match(request).then(
        (cacheada) =>
          cacheada ||
          fetch(request).then((resposta) => {
            const copia = resposta.clone();
            caches.open(VERSAO).then((cache) => cache.put(request, copia)).catch(() => undefined);
            return resposta;
          }),
      ),
    );
  }
});

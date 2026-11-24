// Service worker propositalmente mínimo: o BARBIUM é um painel com dado
// que muda o tempo todo (agenda, caixa), então cache agressivo faria mais
// mal que bem. Isso existe só pra satisfazer o requisito de instalabilidade
// do navegador — toda requisição vai direto pra rede, sem cache.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Só mexe nas requisições do próprio site. Scripts de terceiros (pixel da
// Meta e afins) seguem direto pelo navegador: repassados por aqui, eles
// falhavam (net::ERR_FAILED) e o pixel nunca carregava.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
  event.respondWith(fetch(event.request));
});

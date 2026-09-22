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

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});

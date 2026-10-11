/* HUB Circuito — Service Worker v1 */
const CACHE = 'hub-v2';
const SHELL = [
  './',
  './index.html',
  './login.html',
  './arena.html',
  './juizes.html',
  './avaliacao.html',
  './coordenacao.html',
  './ranking.html',
  './cronograma.html',
  './turma.html',
  './documentos.html',
  './rubricas.html',
  './css/styles.css',
  './js/api.js',
  './js/sidebar-roles.js',
  './js/product-ui.js',
  './favicon.svg',
  './logo-horizontal.svg',
  './logo-horizontal-escuro.svg',
  './logo-claro.svg',
  './logo-institucional.svg',
  './manifest.json'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(SHELL); })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (e) {
  var url = e.request.url;

  /* Passa direto para a rede: Apps Script e outros serviços externos */
  if (url.indexOf('script.google.com') >= 0 || url.indexOf('googleapis.com') >= 0) return;

  /* Estratégia: cache-first para assets estáticos; rede-first para HTML */
  var isHtml = e.request.headers.get('accept') && e.request.headers.get('accept').indexOf('text/html') >= 0;

  if (isHtml) {
    /* Rede primeiro, fallback para cache */
    e.respondWith(
      fetch(e.request).then(function (r) {
        var clone = r.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, clone); });
        return r;
      }).catch(function () {
        return caches.match(e.request);
      })
    );
  } else {
    /* Cache primeiro, atualiza em segundo plano */
    e.respondWith(
      caches.match(e.request).then(function (cached) {
        var fetched = fetch(e.request).then(function (r) {
          if (r && r.status === 200 && r.type === 'basic') {
            var clone = r.clone();
            caches.open(CACHE).then(function (c) { c.put(e.request, clone); });
          }
          return r;
        });
        return cached || fetched;
      })
    );
  }
});

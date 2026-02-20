const CACHE_NAME = 'kidstimer-v2';
const ASSETS = [
  '/mykidstimer/',
  '/mykidstimer/index.html',
  '/mykidstimer/css/style.css',
  '/mykidstimer/js/app.js',
  '/mykidstimer/js/clock.js',
  '/mykidstimer/js/timer.js',
  '/mykidstimer/assets/mascot.svg',
  '/mykidstimer/icons/icon-192.png',
  '/mykidstimer/icons/icon-512.png',
  '/mykidstimer/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});

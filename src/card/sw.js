// Card service worker, scope /card/. Precaches everything the card needs so it
// opens offline. VERSION changes whenever any precached file changes, which
// installs a fresh cache and drops the old one.
const VERSION = '__VERSION__';
const ASSETS = __ASSETS__;
const CACHE = `card-${VERSION}`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('card-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Cache first: the card must open instantly, signal or not.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.open(CACHE)
      .then((cache) => cache.match(event.request, { ignoreSearch: true }))
      .then((hit) => hit || fetch(event.request)),
  );
});

/* Only the offline screen and public icons are cached. Account data stays online. */
const CACHE = 'transmedina-static-v1';
const OFFLINE = '/pwa/offline.html';
const ASSETS = [OFFLINE, '/pwa/icon-192.png', '/pwa/icon-512.png', '/pwa/apple-touch-icon.png', '/pwa/favicon-32.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith('transmedina-static-') && key !== CACHE).map(key => caches.delete(key)),
  )).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () => {
      const offline = await caches.match(OFFLINE);
      return offline || new Response('Sin conexión. Vuelve a intentarlo cuando tengas internet.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }));
  } else if (ASSETS.includes(url.pathname)) {
    event.respondWith(caches.match(request).then(cached => cached || fetch(request)));
  }
});

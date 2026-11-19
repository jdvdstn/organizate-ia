const CACHE_PREFIX = 'organizate-ia-';
const CACHE_VERSION = 'v1';
const SHELL_CACHE = `${CACHE_PREFIX}shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `${CACHE_PREFIX}runtime-${CACHE_VERSION}`;
const APP_SHELL_URL = new URL('./', self.registration.scope).href;
const CORE_ASSETS = [
  APP_SHELL_URL,
  new URL('manifest.json', self.registration.scope).href,
  new URL('icons/icon-192.png', self.registration.scope).href,
  new URL('icons/icon-512.png', self.registration.scope).href,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith(CACHE_PREFIX) &&
                key !== SHELL_CACHE &&
                key !== RUNTIME_CACHE,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached && request.mode !== 'navigate') return cached;

      try {
        const response = await fetch(request);
        if (response.ok && response.type === 'basic') {
          const cacheName =
            request.mode === 'navigate' ? SHELL_CACHE : RUNTIME_CACHE;
          const cache = await caches.open(cacheName);
          await cache.put(request, response.clone());
          if (request.mode === 'navigate') {
            await cache.put(APP_SHELL_URL, response.clone());
          }
        }
        return response;
      } catch {
        if (cached) return cached;
        if (request.mode === 'navigate') {
          const appShell = await caches.match(APP_SHELL_URL);
          if (appShell) return appShell;
        }
        return new Response('Este recurso no está disponible sin conexión.', {
          status: 503,
          statusText: 'Sin conexión',
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      }
    })(),
  );
});

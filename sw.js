const CACHE_NAME = 'solplay-pwa-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/style.css?v=3.6',
  '/logo.png',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SolPlay SW] Pre-caching static assets');
      return cache.addAll(STATIC_ASSETS).catch((err) => console.warn('[SolPlay SW] Pre-cache partial skip:', err));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SolPlay SW] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Dynamic real-time APIs should NEVER use cache-first (RPC, ESPN, Supabase, Streams)
  if (
    url.hostname.includes('solana.com') ||
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('espn.com') ||
    url.hostname.includes('thesportsdb.com') ||
    url.pathname.includes('.m3u8') ||
    url.pathname.includes('.ts')
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Network first with cache fallback for static app resources
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});

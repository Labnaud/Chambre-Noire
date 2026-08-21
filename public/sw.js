// Stamped from package.json at build time (see swVersionPlugin in
// vite.config.ts). The worker serves cache-first, so a release only reaches a
// returning visitor when this name changes and the old cache is evicted.
const CACHE_NAME = 'chambre-noire-__APP_VERSION__';

// Resolved against the worker's own URL rather than the domain root, so the
// same file works whether the app is served from / or from a project subpath
// like /Chambre-Noire/. Absolute paths would 404 under a subpath, and a single
// 404 rejects cache.addAll(), which aborts install and leaves no worker at all.
const ROOT = new URL('./', self.location).href;
const asset = (path) => new URL(path, ROOT).href;

const STATIC_ASSETS = [
    ROOT,
    asset('index.html'),
    asset('manifest.json'),
    asset('icons/icon-192.svg'),
    asset('icons/icon-512.svg')
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // Skip chrome-extension and other non-http requests
    if (!event.request.url.startsWith('http')) return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // Return cached response if available
            if (cachedResponse) {
                // Fetch in background to update cache
                fetch(event.request).then((response) => {
                    if (response && response.status === 200) {
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, response.clone());
                        });
                    }
                }).catch(() => { });
                return cachedResponse;
            }

            // Otherwise fetch from network
            return fetch(event.request).then((response) => {
                // Cache successful responses
                if (response && response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            }).catch(() => {
                // Return offline fallback for navigation requests
                if (event.request.mode === 'navigate') {
                    return caches.match(ROOT);
                }
                return new Response('Offline', { status: 503 });
            });
        })
    );
});

const CACHE_VERSION = 'shopping-list-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.webmanifest'
];

// Install event: cache core app files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => {
      self.skipWaiting();
    })
  );
});

// Activate event: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_VERSION) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      self.clients.claim();
    })
  );
});

// Fetch event: cache-first strategy for app files, network-first for others
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Check if this is a core app file
  const isCoreFile = ASSETS_TO_CACHE.some(asset => {
    return url.pathname === asset || 
           (url.pathname === '/' && asset === '/') ||
           url.pathname.endsWith(asset);
  });
  
  if (isCoreFile) {
    // Cache-first strategy for app shell
    event.respondWith(
      caches.match(event.request).then(response => {
        return response || fetch(event.request);
      }).catch(() => {
        return caches.match('/index.html');
      })
    );
  } else {
    // Network-first strategy for other resources (fonts, etc.)
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request);
      })
    );
  }
});

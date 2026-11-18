const CACHE_NAME = 'tkj3tav-v3'; // Ubah versi ini setiap kali update kode
const urlsToCache = [
  '/',
  '/index.html'
];

// Simpan file baru
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// Hapus cache lama secara otomatis
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName); // Hapus cache versi lama
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Ambil dari cache, jika tidak ada ambil dari internet
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});

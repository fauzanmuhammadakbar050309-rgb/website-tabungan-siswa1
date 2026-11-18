const CACHE_NAME = 'tkj3tav-v5'; // Ubah versi ini setiap kali update kode
const urlsToCache = ['/', '/index.html'];

// Simpan file awal (selalu ambil yang terbaru dari server, bukan dari cache browser)
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(urlsToCache.map(u => new Request(u, { cache: 'reload' })))
    )
  );
  self.skipWaiting();
});

// Hapus cache lama secara otomatis
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(names.map(n => (n !== CACHE_NAME ? caches.delete(n) : null)))
    )
  );
  self.clients.claim();
});

// Internet dulu (selalu versi terbaru), cache hanya sebagai cadangan saat offline
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(req, { cache: 'no-cache' })
      .then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});


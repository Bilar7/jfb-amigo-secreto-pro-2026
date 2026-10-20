/* Bilar Amigo Secreto — Service Worker (PWA)
 * - Guarda o "esqueleto" da app para abrir instantaneamente e funcionar com rede fraca.
 * - Nunca guarda chamadas ao Firebase (dados em tempo real vêm sempre da rede/cache do Firestore).
 */
const VERSION = 'bilar-v7';
const SHELL = ['./', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'favicon.svg', 'photos/splash.jpg', 'photos/hero.jpg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || new URL('./', self.location.href).toString();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const appClient = clients.find((client) => new URL(client.url).origin === self.location.origin);
      if (appClient) {
        return appClient.navigate(targetUrl).then((client) => client?.focus());
      }
      return self.clients.openWindow(targetUrl);
    }),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Firebase, Google Fonts, etc. → rede normal

  // Páginas: rede primeiro, cache como reserva (assim há sempre a versão mais recente)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put('./', copy));
          return res;
        })
        .catch(() => caches.match('./')),
    );
    return;
  }

  // Ficheiros estáticos: cache primeiro e atualização em segundo plano
  event.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit || net;
    }),
  );
});

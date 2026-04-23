// Boreal client service worker. Cache-first for static assets, network-first for API.
const CACHE_VERSION = "v1";
const STATIC_CACHE  = `boreal-client-static-${CACHE_VERSION}`;
const OFFLINE_URL   = "/offline.html";

const STATIC_ASSETS = ["/", "/index.html", "/offline.html", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      await cache.addAll(STATIC_ASSETS);
      self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (event) => {
  if (!event.data?.type) return;
  if (event.data.type === "SKIP_WAITING") self.skipWaiting();
  if (event.data.type === "CLEAR_CACHES" || event.data.type === "AUTH_REFRESH") {
    event.waitUntil(caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))));
  }
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // API calls — network-only, never cache
  if (url.pathname.startsWith("/api") || url.origin.includes("server.boreal.financial")) {
    return;
  }

  // HTML navigation — network-first with offline fallback
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // Static assets — cache-first
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      if (res.ok && url.origin === self.location.origin) {
        const clone = res.clone();
        caches.open(STATIC_CACHE).then((c) => c.put(req, clone));
      }
      return res;
    }).catch(() => caches.match(OFFLINE_URL)))
  );
});

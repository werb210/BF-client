/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { registerRoute, NavigationRoute } from "workbox-routing";
import { NetworkFirst, NetworkOnly, StaleWhileRevalidate, CacheFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { deleteAllCaches, isApiRequest, isPublicLenderProductsRequest } from "./pwa/swRoutes";

declare const self: ServiceWorkerGlobalScope;
const wbManifestToken = "__WB_MANIFEST";
void (self as ServiceWorkerGlobalScope & Record<string, unknown>)[wbManifestToken];


precacheAndRoute(self.__WB_MANIFEST || []);
cleanupOutdatedCaches();

const navHandler = new NetworkFirst({
  cacheName: "bf-client-navigations",
  networkTimeoutSeconds: 4,
  plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })]
});
registerRoute(new NavigationRoute(navHandler, {
  denylist: [/^\/api\//, /^\/_/, /\.\w+$/]
}));

// BF_CLIENT_v789_SW_NO_AUTH_CACHE
// The public lender-products catalogue is the only API response kept on the
// device. It gets its own cache: longer TTL (1h) + dedicated 50-entry pool.
// StaleWhileRevalidate returns the cached catalog immediately and refreshes in
// the background - applicants on slow mobile data never wait for it to load.
// (BF_CLIENT_BLOCK_v76_FORM_RESPONSE_QUEUE_AND_LP_CACHE_v1)
registerRoute(
  ({ url, request }) => isPublicLenderProductsRequest(url, request.method),
  new StaleWhileRevalidate({
    cacheName: "bf-client-lender-products",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 })
    ]
  })
);

// Registered before the image route so an authenticated image (a document
// preview served from /api) is never cached either.
// Workbox only routes GETs here; other methods are never cached by default.
registerRoute(({ url }) => isApiRequest(url), new NetworkOnly(), "GET");

registerRoute(
  ({ request }) => request.destination === "image",
  new CacheFirst({
    cacheName: "bf-client-images",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 })
    ]
  })
);

registerRoute(
  ({ request }) => request.destination === "font",
  new StaleWhileRevalidate({ cacheName: "bf-client-fonts" })
);

// BF_CLIENT_v789_SW_NO_AUTH_CACHE - sign-out posts CLEAR_CACHES so nothing the
// signed-out client saw (including the precache and navigations) stays behind.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
  if (event.data && event.data.type === "CLEAR_CACHES") {
    const port = event.ports && event.ports[0];
    event.waitUntil(
      deleteAllCaches()
        .then(() => port?.postMessage({ type: "CACHES_CLEARED" }))
        .catch(() => port?.postMessage({ type: "CACHES_CLEAR_FAILED" }))
    );
  }
});

self.addEventListener("push", (event) => {
  let payload: { title?: string; body?: string; url?: string; icon?: string; tag?: string } = {};
  try { payload = event.data ? event.data.json() : {}; }
  catch { payload = { title: "Boreal", body: event.data ? event.data.text() : "" }; }
  const title = payload.title || "Boreal";
  const options: NotificationOptions = {
    body: payload.body || "",
    icon: payload.icon || "/icons/icon-192x192.png",
    badge: "/icons/icon-192x192.png",
    tag: payload.tag,
    data: { url: payload.url || "/" }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) {
          (c as WindowClient).navigate(targetUrl).catch(() => {});
          return (c as WindowClient).focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});

// BF_CLIENT_BACKGROUND_SYNC_v151
// Wake any client that exists. If there is no client, reject so the browser
// retries with backoff instead of silently dropping the queued upload.
self.addEventListener("sync", (event: any) => {
  if (event.tag !== "bf-client-bg-sync") return;
  event.waitUntil(
    self.clients.matchAll({ includeUncontrolled: true }).then((cs) => {
      if (cs.length > 0) {
        cs.forEach((c) => c.postMessage({ type: "BG_SYNC_TRIGGER" }));
        return;
      }
      return Promise.reject(new Error("no_client_to_drain_queue"));
    })
  );
});

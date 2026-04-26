/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { registerRoute, NavigationRoute } from "workbox-routing";
import { NetworkFirst, StaleWhileRevalidate, CacheFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { CacheableResponsePlugin } from "workbox-cacheable-response";

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

registerRoute(
  ({ url, request }) => request.method === "GET" && url.pathname.startsWith("/api/"),
  new NetworkFirst({
    cacheName: "bf-client-api",
    networkTimeoutSeconds: 6,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 300 })
    ]
  })
);

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

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
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

self.addEventListener("sync", (event: any) => {
  if (event.tag === "bf-client-bg-sync") {
    event.waitUntil(self.clients.matchAll().then((cs) => {
      cs.forEach((c) => c.postMessage({ type: "BG_SYNC_TRIGGER" }));
    }));
  }
});

// BF_CLIENT_v789_SW_NO_AUTH_CACHE - routing decisions for src/sw.ts, kept apart
// from the worker entry so they can be tested without a service worker scope.

// Matched on the path only, because the API lives on another origin
// (server.boreal.financial).
export function isPublicLenderProductsRequest(url: URL, method: string): boolean {
  return method === "GET" && url.pathname === "/api/client/lender-products";
}

// Every other /api/* response is authenticated (application status, documents,
// messages, offers, /api/portal/lender-products/required-docs). Caching them
// would leave one client's data readable on a shared device after sign-out, so
// they always go to the network and are never stored.
export function isApiRequest(url: URL): boolean {
  return url.pathname.startsWith("/api/");
}

/** Delete every Cache Storage entry this origin holds. */
export async function deleteAllCaches(cacheStorage: CacheStorage = caches): Promise<void> {
  const keys = await cacheStorage.keys();
  await Promise.all(keys.map((key) => cacheStorage.delete(key)));
}

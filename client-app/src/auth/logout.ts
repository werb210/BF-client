import { clearServiceWorkerCaches } from "../pwa/serviceWorker";
import { ClientProfileStore } from "../state/clientProfiles";
import { OfflineStore } from "../state/offline";

const STORAGE_KEYS_TO_REMOVE = [
  "auth_token",
  "boreal_client_token",
] as const;

export async function clearBrowserCaches() {
  if (!("caches" in globalThis)) return;
  try {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  } catch {
    // ignore cache clear failures
  }
}

export async function unregisterServiceWorkers() {
  if (typeof navigator === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  } catch {
    // ignore cache clear failures
  }
}

export function clearClientStorage() {
  OfflineStore.clear();
  ClientProfileStore.clearAll();

  try {
    STORAGE_KEYS_TO_REMOVE.forEach((key) => {
      localStorage.removeItem(key);
    });
    localStorage.clear();
    sessionStorage.clear();
  } catch {
    // ignore cache clear failures
  }
}

export function logout(options?: { redirectTo?: string }): void {
  const redirectTo = options?.redirectTo ?? "/portal";
  clearClientStorage();

  void Promise.all([
    clearServiceWorkerCaches("logout"),
    clearBrowserCaches(),
    unregisterServiceWorkers(),
  ]);

  if (typeof window === "undefined") return;
  window.location.assign(redirectTo);
}

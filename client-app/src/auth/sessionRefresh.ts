import { hasToken } from "@/lib/auth";
import { getToken } from "@/lib/api";
import { apiRequest } from "../api/client";
import { clearServiceWorkerCaches } from "../pwa/serviceWorker";
import { getActiveClientSessionToken } from "../state/clientSession";
import { ClientProfileStore } from "../state/clientProfiles";
import { setSessionRefreshing } from "../state/sessionRefresh";

let refreshPromise: Promise<boolean> | null = null;
let refreshFailed = false;

export async function refreshSessionOnce(): Promise<boolean> {
  if (refreshFailed) return false;
  if (refreshPromise) return refreshPromise;

  const token = getActiveClientSessionToken();
  const legacyToken = getToken();
  if (!token && !hasToken() && !legacyToken) return true;

  setSessionRefreshing(true);
  refreshPromise = (apiRequest("/api/auth/refresh", {
    method: "POST",
  }) as Promise<unknown>)
    .then(() => true)
    .catch(() => false)
    .finally(() => {
      setSessionRefreshing(false);
      refreshPromise = null;
    });

  const success = await refreshPromise;
  if (!success) {
    refreshFailed = true;
    ClientProfileStore.clearPortalSessions();
    clearServiceWorkerCaches("otp");
  }
  return success;
}

export function resetRefreshFailure() {
  refreshFailed = false;
}

import { ClientProfileStore } from "../state/clientProfiles";
import { clearServiceWorkerCaches } from "../pwa/serviceWorker";
import { setSessionRefreshing } from "../state/sessionRefresh";
import { getActiveClientSessionToken } from "../state/clientSession";
import { apiRequest } from "../api/client";
import { hasToken } from "@/lib/auth";

let refreshPromise: Promise<boolean> | null = null;
let refreshFailed = false;

function redirectToOtp() {
  if (typeof window === "undefined") return;
  window.location.assign("/portal");
}

export async function refreshSessionOnce() {
  if (refreshFailed) return false;
  if (refreshPromise) return refreshPromise;

  const token = getActiveClientSessionToken();
  if (!token && !hasToken()) return true;

  setSessionRefreshing(true);
  refreshPromise = (apiRequest("/api/client/session/refresh", {
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
    await clearServiceWorkerCaches("otp");
    redirectToOtp();
  }
  return success;
}

export function resetRefreshFailure() {
  refreshFailed = false;
}

import { apiRequest } from "../api/client";
import { clearServiceWorkerCaches } from "../pwa/serviceWorker";
import { ClientProfileStore } from "../state/clientProfiles";

let refreshLocked = false

export async function refreshSessionOnce(): Promise<boolean> {
  if (refreshLocked) return false

  try {
    await apiRequest("/api/auth/refresh", { method: "POST" })
    return true
  } catch {
    refreshLocked = true

    ClientProfileStore.clearPortalSessions()
    clearServiceWorkerCaches("otp")

    return false
  }
}

export function resetRefreshFailure() {
  refreshLocked = false
}

import { apiRequest } from "@/lib/apiClient"
import { clearToken, getToken, setToken } from "@/auth/token"
import { ClientProfileStore } from "@/state/clientProfiles"
import { clearServiceWorkerCaches } from "@/pwa/serviceWorker"

let failed = false

export async function refreshSessionOnce(): Promise<boolean> {
  if (getToken()) {
    failed = false
  }
  if (failed) return false

  try {
    const data = await apiRequest<{ token?: string }>("/api/auth/refresh", { method: "POST" })
    if (data?.token) {
      setToken(data.token)
    }
    return true
  } catch {
    failed = true
    clearToken()
    ClientProfileStore.clearPortalSessions()
    clearServiceWorkerCaches("otp")
    return false
  }
}

export const refreshSession = refreshSessionOnce

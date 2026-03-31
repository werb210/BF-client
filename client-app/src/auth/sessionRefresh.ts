import { apiRequest } from "@/lib/apiClient"
import { getToken, setToken, clearToken } from "@/auth/token"

let failed = false

export async function refreshSessionOnce(): Promise<boolean> {
  if (getToken()) {
    failed = false
  }

  if (failed) return false

  try {
    const res = await apiRequest("/api/auth/refresh", {
      method: "POST",
    })

    if (res?.token) {
      setToken(res.token)
      return true
    }

    throw new Error("INVALID_REFRESH")
  } catch {
    failed = true
    clearToken()
    return false
  }
}

export const refreshSession = refreshSessionOnce

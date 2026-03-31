import { apiRequest } from "@/lib/apiClient"
import { setToken, clearToken } from "@/auth/token"

export async function refreshSession(): Promise<boolean> {
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
    clearToken()
    return false
  }
}

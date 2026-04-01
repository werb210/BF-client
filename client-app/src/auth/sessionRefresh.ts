import { apiCall } from "@/lib/apiClient"
import { setToken, clearToken } from "@/auth/token"

export async function refreshSession(): Promise<boolean> {
  try {
    const res = await apiCall<{ token?: string }>("/api/auth/refresh", {
      method: "POST",
    })

    if (res?.token) {
      setToken(res.token)
      return true
    }

    clearToken()
    return false
  } catch {
    clearToken()
    return false
  }
}

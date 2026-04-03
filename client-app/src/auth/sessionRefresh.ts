import { apiRequest } from "@/lib/api"
import { clearToken, getToken, setToken } from "./token"

let refreshing = false

export async function refreshSession(): Promise<boolean> {
  if (refreshing) return false

  const token = getToken()
  if (!token) return false

  refreshing = true

  try {
    const res = await apiRequest<{ token: string }>("/api/auth/refresh", {
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
  } finally {
    refreshing = false
  }
}

import { apiRequest } from "@/lib/api"
import { clearToken, getToken, setToken } from "./token"

let refreshPromise: Promise<boolean> | null = null

export async function refreshSession(): Promise<boolean> {
  if (refreshPromise) return refreshPromise

  const token = getToken()
  if (!token) return false

  refreshPromise = (async () => {
    try {
      const json = await apiRequest<{ data?: { token?: string }; token?: string }>("/api/auth/refresh", {
        method: "POST",
      })
      const nextToken = json?.data?.token ?? json?.token

      if (!nextToken) {
        clearToken()
        return false
      }

      setToken(nextToken)
      return true
    } catch {
      clearToken()
      return false
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

import { getToken, setToken, clearToken } from "@/auth/token"

let refreshing: Promise<boolean> | null = null

export function refreshSession(): Promise<boolean> {
  if (refreshing) return refreshing

  refreshing = (async () => {
    const token = getToken()
    if (!token) {
      clearToken()
      return false
    }

    try {
      const res = await fetch(/* apiRequest */ "/api/auth/refresh", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        clearToken()
        return false
      }

      const data = await res.json().catch(() => null)

      if (!data?.token) {
        clearToken()
        return false
      }

      setToken(data.token)
      return true
    } catch {
      clearToken()
      return false
    } finally {
      refreshing = null
    }
  })()

  return refreshing
}

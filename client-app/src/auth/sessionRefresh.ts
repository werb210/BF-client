import { clearToken, getToken, setToken } from "./token"

let refreshPromise: Promise<boolean> | null = null

export async function refreshSession(): Promise<boolean> {
  if (refreshPromise) return refreshPromise

  const token = getToken()
  if (!token) return false

  refreshPromise = (async () => {
    try {
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
      })

      if (!res.ok) {
        clearToken()
        return false
      }

      const json = await res.json().catch(() => ({}))
      const nextToken = json?.data?.token

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

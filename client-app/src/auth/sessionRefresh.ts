let refreshing = false

export async function refreshSession(): Promise<boolean> {
  if (refreshing) return false
  refreshing = true

  try {
    const res = await fetch("/api/auth/refresh", { method: "POST" })

    if (!res.ok) {
      localStorage.removeItem("token")
      return false
    }

    const data = await res.json().catch(() => null)

    if (!data || !data.token) {
      localStorage.removeItem("token")
      return false
    }

    localStorage.setItem("token", data.token)
    return true
  } catch {
    localStorage.removeItem("token")
    return false
  } finally {
    refreshing = false
  }
}

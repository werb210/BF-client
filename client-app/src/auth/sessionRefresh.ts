export async function refreshSession(): Promise<boolean> {
  const token = localStorage.getItem("token")

  if (!token) {
    localStorage.removeItem("token")
    return false
  }

  try {
    const res = await fetch(/* apiRequest */ "/api/auth/refresh", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!res.ok) {
      localStorage.removeItem("token")
      return false
    }

    const data = await res.json().catch(() => null)

    if (!data?.token) {
      localStorage.removeItem("token")
      return false
    }

    localStorage.setItem("token", data.token)
    return true
  } catch {
    localStorage.removeItem("token")
    return false
  }
}

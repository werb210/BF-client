let cachedToken: string | null = null

export function getToken(): string | null {
  if (cachedToken !== null) return cachedToken

  const t = localStorage.getItem("token")
  if (!t || t === "null" || t === "undefined") {
    cachedToken = null
    return null
  }

  cachedToken = t
  return t
}

export function setToken(t: string) {
  cachedToken = t
  localStorage.setItem("token", t)
}

export function clearToken() {
  cachedToken = null
  localStorage.removeItem("token")
}

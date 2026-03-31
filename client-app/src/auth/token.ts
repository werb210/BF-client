export function getToken(): string | null {
  const t = localStorage.getItem("token")

  if (!t || t === "null" || t === "undefined" || t === "") {
    return null
  }

  return t
}

export function setToken(t: string) {
  if (!t || t === "null" || t === "undefined") {
    localStorage.removeItem("token")
    return
  }

  localStorage.setItem("token", t)
}

export function clearToken() {
  localStorage.removeItem("token")
}

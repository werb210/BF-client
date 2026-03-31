import { getToken, clearToken } from "@/auth/token"

const PUBLIC_PREFIXES = ["/api/auth", "/health"]

function isPublic(url: string) {
  try {
    const u = new URL(url, window.location.origin)
    return PUBLIC_PREFIXES.some(p => u.pathname.startsWith(p))
  } catch {
    return PUBLIC_PREFIXES.some(p => url.startsWith(p))
  }
}

export async function apiRequest(url: string, options: RequestInit = {}) {
  const token = getToken()

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  }

  if (!isPublic(url)) {
    if (!token) throw new Error("AUTH_REQUIRED")
    headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(url, { ...options, headers }) // apiRequest

  if (res.status === 401) {
    clearToken()
    throw new Error("INVALID_TOKEN")
  }

  if (res.status === 204) return null

  let data: any = {}
  try {
    data = await res.json()
  } catch {}

  if (!res.ok) {
    if (data?.error) throw new Error(data.error)
    throw new Error("REQUEST_FAILED")
  }

  return data
}

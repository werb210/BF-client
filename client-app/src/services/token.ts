import { clearToken } from "@/auth/tokenStorage"

export function getAccessToken(): string | null {
  return localStorage.getItem("token")
}

export function getTokenOrFail(): string {
  if (typeof localStorage === "undefined") {
    throw new Error("FATAL: TOKEN INVALID OR MISSING")
  }

  const token = localStorage.getItem("token")

  if (!token || token === "undefined" || token === "null") {
    throw new Error("FATAL: TOKEN INVALID OR MISSING")
  }

  return token
}

export function clearStoredAuth() {
  clearToken()
}

import { clearToken } from "@/auth/tokenStorage"

export function getAccessToken(): string | null {
  return localStorage.getItem("bf_token")
}

export function clearStoredAuth() {
  clearToken()
}

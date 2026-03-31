import { clearToken } from "@/auth/tokenStorage"

export function getAccessToken(): string | null {
  return localStorage.getItem("token")
}

export function clearStoredAuth() {
  clearToken()
}

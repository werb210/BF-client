import { clearToken } from "@/auth/tokenStorage"

export function getAccessToken(): string | null {
  return localStorage.getItem("token")
}

export function getTokenOrFail(): string {
  const token = localStorage.getItem("token")

  if (!token || token === "undefined" || token === "null" || token.trim() === "") {
    throw new Error("[AUTH BLOCK] INVALID TOKEN")
  }

  return token
}

export function saveToken(token: string) {
  if (!token || token.trim() === "") {
    throw new Error("[TOKEN SAVE FAILED]")
  }

  localStorage.setItem("token", token)

  const verify = localStorage.getItem("token")

  if (!verify) {
    throw new Error("[TOKEN WRITE FAILURE]")
  }
}

export function clearStoredAuth() {
  clearToken()
}

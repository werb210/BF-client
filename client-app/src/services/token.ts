import { clearToken } from "@/auth/tokenStorage"

export function getAccessToken(): string | null {
  return localStorage.getItem("token")
}

export function getTokenOrFail(): string {
  if (typeof localStorage === "undefined") {
    throw new Error("[AUTH BLOCK] INVALID TOKEN STATE")
  }

  const token = localStorage.getItem("token")

  if (
    token === null ||
    token === undefined ||
    token.trim() === "" ||
    token === "undefined" ||
    token === "null"
  ) {
    throw new Error("[AUTH BLOCK] INVALID TOKEN STATE")
  }

  return token
}

export function clearStoredAuth() {
  clearToken()
}

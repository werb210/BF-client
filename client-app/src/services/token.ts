import { clearToken } from "@/auth/tokenStorage"

export function getAccessToken(): string | null {
  return localStorage.getItem("token")
}

export function getTokenOrFail(): string {
  const token = localStorage.getItem("token")

  if (
    !token ||
    token.trim() === "" ||
    token === "undefined" ||
    token === "null"
  ) {
    throw new Error("[AUTH BLOCK]")
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

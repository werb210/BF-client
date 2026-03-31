import { clearToken, getToken, setToken } from "@/lib/api"

export function getAccessToken(): string | null {
  return getToken()
}

export function getTokenOrFail(): string {
  const token = getToken()

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

  setToken(token)

  const verify = getToken()

  if (!verify) {
    throw new Error("[TOKEN WRITE FAILURE]")
  }
}

export function clearStoredAuth() {
  clearToken()
}

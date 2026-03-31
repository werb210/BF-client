import { clearToken } from "@/auth/token"

export function handleAuthError(err: unknown) {
  if (err instanceof Error && err.message === "INVALID_TOKEN") {
    clearToken()
  }
  throw err
}

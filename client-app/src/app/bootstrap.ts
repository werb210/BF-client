import { apiRequest } from "../lib/api"
import { getTokenOrFail } from "@/services/token"

export type InitialSession = {
  token: string
}

function readTokenFromClientSession(stored: string): string | null {
  try {
    const session = JSON.parse(stored)
    return typeof session?.token === "string" ? session.token : null
  } catch {
    return stored
  }
}

export function enforceAuthStartup() {
  try {
    getTokenOrFail()
  } catch {
    window.location.href = "/login"
    throw new Error("[BOOT BLOCKED]")
  }
}

export async function bootstrapSession(): Promise<InitialSession | null> {
  enforceAuthStartup()

  const stored = localStorage.getItem("token")
  if (!stored) {
    return null
  }

  await apiRequest("/api/auth/me")

  const token = readTokenFromClientSession(stored)
  if (!token) {
    return null
  }

  return {
    token,
  }
}

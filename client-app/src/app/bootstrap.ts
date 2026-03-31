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

export function enforceAuthBootstrap() {
  try {
    getTokenOrFail()
  } catch {
    throw new Error("[BOOT BLOCKED] TOKEN NOT PRESENT")
  }
}

export async function bootstrapSession(): Promise<InitialSession | null> {
  enforceAuthBootstrap()

  const stored = localStorage.getItem("token")
  if (!stored) {
    return null
  }

  await apiRequest("/auth/me")

  const token = readTokenFromClientSession(stored)
  if (!token) {
    return null
  }

  return {
    token,
  }
}

import { getToken } from "@/auth/token"

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

export async function bootstrapSession(): Promise<InitialSession | null> {
  const stored = getToken()
  if (!stored) {
    return null
  }

  const token = readTokenFromClientSession(stored)
  if (!token) {
    return null
  }

  return {
    token,
  }
}

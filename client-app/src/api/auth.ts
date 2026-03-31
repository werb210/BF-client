import { apiRequest } from "../lib/api"
import { saveToken } from "@/services/token"

function assertPhone(phone: string) {
  if (typeof phone !== "string") {
    throw new Error("Phone is required")
  }
}

export const startOtp = async (phone: string) => {
  assertPhone(phone)
  const data = await apiRequest<{ ok?: boolean }>("/api/auth/otp/start", {
    method: "POST",
    body: JSON.stringify({ phone }),
  })

  if (!data) {
    throw new Error("[API ERROR] EMPTY RESPONSE")
  }

  return data
}

export const verifyOtp = async (phone: string, code: string) => {
  assertPhone(phone)

  const payload = { phone, code }
  const res = await apiRequest<{ token?: string; user?: unknown; data?: { token?: string; user?: unknown } }>(
    "/api/auth/verify",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  )

  const token = res.token ?? res.data?.token

  if (!token || token.trim() === "") {
    throw new Error("[AUTH FAILED]")
  }

  saveToken(token)

  return res
}

export const sendOtp = startOtp
export const verifyOtpCode = verifyOtp

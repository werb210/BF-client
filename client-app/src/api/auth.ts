import { apiRequest } from "../lib/api"
import { saveToken } from "@/services/token"

function assertPhone(phone: string) {
  if (typeof phone !== "string") {
    throw new Error("Phone is required")
  }
}

export const startOtp = async (payloadOrPhone: { phone: string } | string) => {
  const payload = typeof payloadOrPhone === "string" ? { phone: payloadOrPhone } : payloadOrPhone
  assertPhone(payload.phone)
  const data = await apiRequest<{ ok?: boolean }>("/api/auth/start-otp", {
    method: "POST",
    body: JSON.stringify(payload),
  })

  if (!data) {
    throw new Error("[API ERROR] EMPTY RESPONSE")
  }

  return data
}

export const verifyOtp = async (
  payloadOrPhone: { phone: string; code: string } | string,
  maybeCode?: string,
) => {
  const payload =
    typeof payloadOrPhone === "string"
      ? { phone: payloadOrPhone, code: maybeCode ?? "" }
      : payloadOrPhone

  assertPhone(payload.phone)
  const res = await apiRequest<{ token?: string; user?: unknown; data?: { token?: string; user?: unknown } }>(
    "/api/auth/verify-otp",
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

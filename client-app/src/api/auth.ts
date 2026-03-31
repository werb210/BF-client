import { apiRequest } from "@/lib/api"

function assertPhone(phone: string) {
  if (typeof phone !== "string") {
    throw new Error("Phone is required")
  }
}

export async function startOtp(phone: string) {
  assertPhone(phone)
  return apiRequest("/api/auth/start-otp", {
    method: "POST",
    body: JSON.stringify({ phone }),
  })
}

export async function verifyOtp(phone: string, code: string) {
  assertPhone(phone)
  return apiRequest("/api/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({ phone, code }),
  })
}

export const sendOtp = startOtp
export const verifyOtpCode = verifyOtp

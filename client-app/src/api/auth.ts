import { apiRequest } from "@/lib/apiClient"
import { setToken } from "@/auth/token"

export function startOtp(phone: string) {
  return apiRequest("/api/auth/start-otp", {
    method: "POST",
    body: JSON.stringify({ phone }),
  })
}

export async function verifyOtp(phone: string, code: string) {
  const res = await apiRequest("/api/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({ phone, code }),
  })

  if (!res?.token) {
    throw new Error("INVALID_LOGIN")
  }

  setToken(res.token)
  return res
}

export const sendOtp = startOtp
export const verifyOtpCode = verifyOtp

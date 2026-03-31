import api from "../lib/api"
import { setToken } from "../lib/auth"

function assertPhone(phone: string) {
  if (typeof phone !== "string") {
    throw new Error("Phone is required")
  }
}

export const startOtp = async (phone: string) => {
  assertPhone(phone)
  const response = await api.post<{ ok?: boolean }>("/auth/otp/start", { phone })
  if (!response.data) {
    throw new Error("[API ERROR] EMPTY RESPONSE")
  }
  return response.data
}

export const verifyOtp = async (phone: string, code: string) => {
  assertPhone(phone)

  const res = await api.post<{ token?: string; user?: unknown; data?: { token?: string; user?: unknown } }>(
    "/auth/otp/verify",
    { phone, code }
  )

  if (!res.data) {
    throw new Error("[API ERROR] EMPTY RESPONSE")
  }

  const token = res.data.token ?? res.data.data?.token

  if (!token || token.trim() === "") {
    throw new Error("[OTP VERIFY FAILED] NO TOKEN RETURNED")
  }

  setToken(token)
  localStorage.setItem("token", token)

  const verify = localStorage.getItem("token")
  if (!verify) {
    throw new Error("[TOKEN SAVE FAILED]")
  }

  return res.data
}

export const sendOtp = startOtp
export const verifyOtpCode = verifyOtp

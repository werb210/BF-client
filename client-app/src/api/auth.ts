export async function sendOtp(phone: string) {
  const res = await fetch("/auth/send-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
  })

  if (!res.ok) {
    throw new Error("Failed to send OTP")
  }

  return res.json()
}

export async function verifyOtp(phone: string, code: string) {
  const res = await fetch("/auth/verify-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, code }),
  })

  if (!res.ok) {
    throw new Error("Invalid OTP")
  }

  return res.json()
}

export const startOtp = sendOtp
export const verifyOtpCode = verifyOtp

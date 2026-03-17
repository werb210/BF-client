import { apiClient } from "@/api/client";

function normalizePhone(input: string) {
  const digits = input.replace(/\D/g, "")
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`
  return `+${digits}`
}

export async function startOtp(phoneInput: string) {
  const payload = {
    phone: normalizePhone(phoneInput)
  }

  const res = await apiClient.post("/auth/otp/start", payload);

  if (res.status < 200 || res.status >= 300) {
    throw new Error(`OTP start failed: ${JSON.stringify(res.data)}`);
  }

  return res.data;
}

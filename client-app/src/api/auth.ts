import { apiFetch } from "@/lib/api";

export async function sendOtp(data: unknown) {
  const payload = typeof data === "string" ? { phone: data } : data;
  return apiFetch("/api/auth/otp/start", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function verifyOtp(data: unknown, code?: string) {
  const payload =
    typeof data === "string" && typeof code === "string"
      ? { phone: data, code }
      : data;

  return apiFetch("/api/auth/otp/verify", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function verifyOtpCode(phone: string, otpCode: string) {
  return verifyOtp({ phone, code: otpCode });
}

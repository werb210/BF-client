import { apiFetch } from "../lib/apiFetch";
import { normalizePhone } from "../lib/phone";

export async function sendOtp(phone: string) {
  return apiFetch("/auth/otp/start", {
    method: "POST",
    body: JSON.stringify({ phone: normalizePhone(phone) }),
  });
}

export async function verifyOtp(phone: string, code: string) {
  const res = await apiFetch<{ token?: string }>("/auth/otp/verify", {
    method: "POST",
    body: JSON.stringify({ phone: normalizePhone(phone), code }),
  });

  if (!res.token) throw new Error("Missing token");

  localStorage.setItem("token", res.token);

  return res.token;
}

export async function verifyOtpCode(phone: string, otpCode: string) {
  return verifyOtp(phone, otpCode);
}

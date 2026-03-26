import { apiFetch } from "@/lib/api";
import { normalizePhone } from "@/utils/normalizePhone";

export { normalizePhone };
export const normalizeOtpPhone = normalizePhone;

export async function startOtp(phone: string) {
  return apiFetch("/auth/otp/start", {
    method: "POST",
    body: { phone },
  });
}

export async function verifyOtp(phone: string, code: string) {
  const result = await apiFetch<{ token?: string } & Record<string, unknown>>("/auth/otp/verify", {
    method: "POST",
    body: { phone, code },
  });

  if (!result?.token || typeof result.token !== "string") {
    throw new Error("Invalid OTP verification response");
  }

  localStorage.setItem("token", result.token);
  return result;
}

export async function requestOtp(phone: string) {
  return startOtp(phone);
}

export async function loginWithOtp(phone: string, code: string) {
  return verifyOtp(phone, code);
}

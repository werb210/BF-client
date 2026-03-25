import { apiRequest } from "@/lib/api";
import { normalizePhone } from "@/utils/normalizePhone";

export { normalizePhone };
export const normalizeOtpPhone = normalizePhone;

export async function startOtp(phone: string) {
  return apiRequest("/auth/otp/start", {
    method: "POST",
    body: { phone },
  });
}

export async function verifyOtp(phone: string, code: string) {
  const result = await apiRequest("/auth/otp/verify", {
    method: "POST",
    body: { phone, code },
  });

  localStorage.setItem("token", result.token);
  return result;
}

export async function requestOtp(phone: string) {
  return startOtp(phone);
}

export async function loginWithOtp(phone: string, code: string) {
  return verifyOtp(phone, code);
}

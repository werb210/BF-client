import { AUTH_ENDPOINTS } from "@/contracts";
import { apiFetch } from "@/lib/api";

export async function sendOtp(phone: string) {
  if (typeof phone !== "string") {
    throw new Error("Phone must be a string");
  }

  return apiFetch(AUTH_ENDPOINTS.OTP_START, {
    method: "POST",
    body: { phone },
  });
}

export async function verifyOtp(data: any) {
  return apiFetch(AUTH_ENDPOINTS.OTP_VERIFY, {
    method: "POST",
    body: data
  });
}

export async function verifyOtpCode(phone: string, otpCode: string) {
  return verifyOtp({ phone, code: otpCode });
}

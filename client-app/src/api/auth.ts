import { AUTH_CONTRACT } from "@/contracts";
import { apiFetch } from "@/lib/api";

export async function sendOtp(data: any) {
  return apiFetch(AUTH_CONTRACT.OTP_START, {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export async function verifyOtp(data: any) {
  return apiFetch(AUTH_CONTRACT.OTP_VERIFY, {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export async function verifyOtpCode(phone: string, otpCode: string) {
  return verifyOtp({ phone, code: otpCode });
}

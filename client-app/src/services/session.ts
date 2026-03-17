import { loginWithOtp, startOtp as startOtpAuth } from "./auth";

export const startOtp = (phone: string) => startOtpAuth(phone);

export function verifyOtp(code: string, phone = "") {
  return loginWithOtp(phone, code);
}

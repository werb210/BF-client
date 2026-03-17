import { startOtp as startOtpAuth, verifyOtp as verifyOtpAuth } from "./auth";

export function getSession() {
  return Promise.resolve(null);
}

export function startOtp(phone: string) {
  return startOtpAuth(phone);
}

export function verifyOtp(code: string, phone = "") {
  return verifyOtpAuth(phone, code);
}

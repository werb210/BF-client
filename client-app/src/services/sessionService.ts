import { startOtp as startOtpAuth, verifyOtp as verifyOtpAuth } from "./auth";

export async function getSession() {
  return null;
}

export async function refreshClientSession() {
  return null;
}

export async function startOtp(payload: { phone?: string; email?: string }) {
  const phone = payload.phone || payload.email || "";
  return startOtpAuth(phone);
}

export async function verifyOtp(code: string, phone = "") {
  return verifyOtpAuth(phone, code);
}

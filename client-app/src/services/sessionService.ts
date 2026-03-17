import { loginWithOtp, startOtp as startOtpAuth } from "./auth";

export async function ensureSessionBootstrap() {
  return Promise.resolve();
}

export async function refreshSession() {
  return Promise.resolve();
}

export async function startOtp(payload: { phone?: string; email?: string }) {
  const phone = payload.phone || payload.email || "";
  return startOtpAuth(phone);
}

export async function verifyOtp(code: string, phone = "") {
  return loginWithOtp(phone, code);
}

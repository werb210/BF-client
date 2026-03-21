import { apiFetch } from "./client";

export async function startOtp(payload: any) {
  return apiFetch("/auth/otp/start", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function verifyOtp(payload: any) {
  return apiFetch("/auth/otp/verify", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function sendOtp(phone: string) {
  if (typeof phone !== "string") {
    throw new Error("Phone must be a string");
  }
  return startOtp({ phone });
}

export async function verifyOtpCode(phone: string, code: string) {
  return verifyOtp({ phone, code });
}

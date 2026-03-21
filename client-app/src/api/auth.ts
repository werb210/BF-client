import { buildUrl } from "../config/api";

export async function sendOtp(phone: string) {
  const res = await fetch(buildUrl("/auth/otp/start"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
  });

  if (!res.ok) throw new Error("OTP send failed");
  return res.json();
}

export async function verifyOtp(phone: string, code: string) {
  const res = await fetch(buildUrl("/auth/otp/verify"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, code }),
  });

  if (!res.ok) throw new Error("OTP verify failed");
  return res.json();
}

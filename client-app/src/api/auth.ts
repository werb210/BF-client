import { normalizePhone } from "../utils/phone";

export async function sendOtp(phone: string) {
  const res = await fetch("/api/auth/otp/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: normalizePhone(phone) }),
  });

  if (!res.ok) throw new Error("OTP send failed");

  return res.json();
}

export async function verifyOtp(phone: string, code: string) {
  const res = await fetch("/api/auth/otp/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phone: normalizePhone(phone),
      code,
    }),
  });

  if (!res.ok) throw new Error("OTP verify failed");

  return res.json();
}

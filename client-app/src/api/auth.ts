import { apiFetch } from "@/lib/api";

export async function sendOtp(phone: string) {
  if (typeof phone !== "string") {
    throw new Error("Phone must be a string");
  }

  return apiFetch("/auth/otp/start", {
    method: "POST",
    body: { phone },
  });
}

export async function verifyOtp(data: { phone: string; code: string }) {
  const result = await apiFetch<{ ok: true; token: string }>("/auth/otp/verify", {
    method: "POST",
    body: { phone: data.phone, code: data.code },
  });

  localStorage.setItem("token", result.token);
  return result;
}

export async function verifyOtpCode(phone: string, otpCode: string) {
  return verifyOtp({ phone, code: otpCode });
}

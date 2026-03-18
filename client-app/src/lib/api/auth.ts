import { apiClient } from "@/api/client";

function normalizePhone(input: string) {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}

export async function startOtp(phoneInput: string) {
  const response = await apiClient.post<{ ok?: boolean }>("/auth/otp/start", {
    phone: normalizePhone(phoneInput),
  });

  if (!response.data?.ok) {
    throw new Error("Invalid API response");
  }

  return { ok: true };
}

export async function verifyOtp(phoneInput: string, code: string) {
  const response = await apiClient.post<{ ok?: boolean; data?: { token: string; user: unknown; nextPath?: string } }>(
    "/auth/otp/verify",
    {
      phone: normalizePhone(phoneInput),
      code,
    }
  );

  if (!response.data?.ok || !response.data?.data) {
    throw new Error("Invalid API response");
  }

  return response.data;
}

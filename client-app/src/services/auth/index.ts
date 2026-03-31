import { sendOtp, verifyOtp } from "@/api/auth";
import { normalizePhone } from "@/lib/phone";
import { saveToken } from "@/services/token";

export { normalizePhone };
export const normalizeOtpPhone = normalizePhone;

export async function startOtp(phone: string) {
  await sendOtp(phone);
  return { ok: true };
}

export async function requestOtp(phone: string) {
  await sendOtp(phone);
  return { ok: true };
}

export async function loginWithOtp(phone: string, code: string): Promise<{ token: string; nextPath?: string }> {
  const data = await verifyOtp(phone, code);

  await new Promise((r) => setTimeout(r, 200));

  const token = data?.data?.token ?? data?.token;

  if (!token || token.trim() === "") {
    throw new Error("[AUTH FAILED]");
  }

  saveToken(token);

  return { token, nextPath: "/portal" };
}

import { sendOtp, verifyOtp } from "@/api/auth";
import { normalizePhone } from "@/lib/phone";

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
  const token = await verifyOtp(phone, code);
  return { token, nextPath: "/portal" };
}

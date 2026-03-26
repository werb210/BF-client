import { sendOtp, verifyOtp } from "@/api/auth";
import { normalizePhone } from "@/lib/phone";

export { normalizePhone };
export const normalizeOtpPhone = normalizePhone;

export async function startOtp(phone: string) {
  return sendOtp(phone);
}

export async function requestOtp(phone: string) {
  return sendOtp(phone);
}

export async function loginWithOtp(phone: string, code: string) {
  const token = await verifyOtp(phone, code);
  return { token };
}

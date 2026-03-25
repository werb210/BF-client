import { apiRequest } from "@/lib/api";
import { OtpVerify } from "@/contracts";
import { normalizePhone } from "@/utils/normalizePhone";

export type OtpRequestResult = {
  ok: boolean;
  message?: string;
  status?: number;
};

export type OtpAuthData = {
  token: string;
  user: Record<string, unknown>;
  nextPath?: string;
};

export type StartOtpResponse = {
  ok: boolean;
};

export type LoginWithOtpResult = OtpAuthData;

export { normalizePhone };
export const normalizeOtpPhone = normalizePhone;

export async function requestOtp(phone: string): Promise<OtpRequestResult> {
  await startOtp(phone);
  return {
    ok: true,
    status: 200,
  };
}

export async function startOtp(phone: string): Promise<StartOtpResponse> {
  return apiRequest("/auth/otp/start", {
    method: "POST",
    body: JSON.stringify({ phone }),
  });
}

export async function verifyOtp(phone: string, otp: string): Promise<LoginWithOtpResult> {
  const res = await apiRequest("/auth/otp/verify", {
    method: "POST",
    body: JSON.stringify({ phone, otp }),
  });

  const parsed = OtpVerify.response.parse({
    ok: true,
    data: res,
  });

  localStorage.setItem("token", parsed.data.token);

  return parsed.data;
}

export async function loginWithOtp(phone: string, code: string): Promise<LoginWithOtpResult> {
  return verifyOtp(phone, code);
}

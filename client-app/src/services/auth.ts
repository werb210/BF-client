import { apiRequest } from "@/lib/api";
import { setToken } from "@/lib/auth";
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
  await apiRequest("/auth/otp/start", {
    method: "POST",
    body: JSON.stringify({ phone: normalizePhone(phone) }),
  });

  return { ok: true };
}

export async function verifyOtp(phone: string, otp: string): Promise<LoginWithOtpResult> {
  const response = await apiRequest<OtpAuthData>("/auth/otp/verify", {
    method: "POST",
    body: JSON.stringify({ phone: normalizePhone(phone), otp }),
  });

  if (!response?.token || !response?.user) {
    throw new Error("Invalid API response");
  }

  setToken(response.token);
  localStorage.setItem("token", response.token);

  return response;
}

export async function loginWithOtp(phone: string, code: string): Promise<LoginWithOtpResult> {
  return verifyOtp(phone, code);
}

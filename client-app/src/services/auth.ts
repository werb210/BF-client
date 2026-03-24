import { apiClient } from "../api/client";
import { setToken } from "@/lib/auth";
import { normalizePhone } from "@/utils/normalizePhone";
import { API_ENDPOINTS } from "@/api/endpoints";

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
  const normalizedPhone = normalizePhone(phone);
  await apiClient.post<Record<string, unknown>>(API_ENDPOINTS.OTP_START, { phone: normalizedPhone });

  return {
    ok: true,
    status: 200,
  };
}

export async function startOtp(phone: string): Promise<StartOtpResponse> {
  await apiClient.post<Record<string, unknown>>(API_ENDPOINTS.OTP_START, { phone: normalizePhone(phone) });
  return { ok: true };
}

export async function loginWithOtp(phone: string, code: string): Promise<LoginWithOtpResult> {
  const response = await apiClient.post<OtpAuthData>(API_ENDPOINTS.OTP_VERIFY, {
    phone: normalizePhone(phone),
    code,
  });

  const { token, user, nextPath } = response.data;

  if (!token || !user) {
    throw new Error("Invalid API response");
  }

  setToken(token);
  localStorage.setItem("token", token);

  return { token, user, nextPath };
}

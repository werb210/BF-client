import api, { apiClient } from "../api/client";
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

function assertResponseContract<T extends { ok?: boolean; data?: unknown }>(response: T): asserts response is T & { ok: true; data: Record<string, unknown> } {
  if (!response?.ok || !response?.data) {
    throw new Error("Invalid API response");
  }
}

export async function requestOtp(phone: string): Promise<OtpRequestResult> {
  const normalizedPhone = normalizePhone(phone);
  const response = await api.post<{ ok?: boolean }>("/auth/otp/start", { phone: normalizedPhone });

  if (!response.data?.ok) {
    throw new Error("Invalid API response");
  }

  return {
    ok: true,
    status: response.status,
  };
}

export async function startOtp(phone: string): Promise<StartOtpResponse> {
  const response = await apiClient.post<{ ok?: boolean }>("/auth/otp/start", { phone: normalizePhone(phone) });

  if (!response.data?.ok) {
    throw new Error("Invalid API response");
  }

  return { ok: true };
}

export async function loginWithOtp(phone: string, code: string): Promise<LoginWithOtpResult> {
  const response = await apiClient.post<{ ok?: boolean; data?: OtpAuthData }>("/auth/otp/verify", {
    phone: normalizePhone(phone),
    code,
  });

  assertResponseContract(response.data);

  const { token, user, nextPath } = response.data.data as OtpAuthData;

  if (!token || !user) {
    throw new Error("Invalid API response");
  }

  setToken(token);

  return { token, user, nextPath };
}

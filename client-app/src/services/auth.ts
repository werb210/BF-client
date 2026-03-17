import { apiClient } from "../api/client";
import { API_ENDPOINTS } from "../api/endpoints";
import { setToken } from "@/auth/tokenStorage";
import { normalizePhone } from "@/utils/normalizePhone";

type ApiPayload = Record<string, any> | null;

function pickFirstString(payload: ApiPayload, keys: string[]): string {
  for (const key of keys) {
    const value = payload?.[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return "";
}

function isOk(payload: ApiPayload): boolean {
  if (!payload || typeof payload !== "object") return false;
  if (payload.ok === true) return true;
  if (payload.success === true) return true;
  if (payload.verified === true) return true;
  if (typeof payload.status === "string" && payload.status.toLowerCase() === "ok") return true;
  return false;
}

export type OtpRequestResult = {
  ok: boolean;
  demoCode?: string;
  message?: string;
  status?: number;
  otpSessionId?: string;
};

export type OtpVerifyResult = {
  ok: boolean;
  sessionToken?: string;
  token?: string;
  applicationToken?: string;
  applicationId?: string;
  submittedToken?: string;
  message?: string;
  status?: number;
};

export { normalizePhone };
export const normalizeOtpPhone = normalizePhone;

function hasExplicitOtpStartFlag(payload: ApiPayload): boolean {
  if (!payload || typeof payload !== "object") return false;
  return typeof payload.ok === "boolean" || typeof payload.success === "boolean";
}

export async function requestOtp(phone: string) {
  const normalizedPhone = normalizePhone(phone);

  try {
    const response = await apiClient.post(API_ENDPOINTS.OTP_START, { phone: normalizedPhone });
    const data = (response.data ?? null) as ApiPayload;
    const payloadOk = isOk(data);
    const ok = response.status >= 200 && response.status < 300 && (!hasExplicitOtpStartFlag(data) || payloadOk);

    if (!ok) {
      console.warn("OTP start rejected", {
        status: response.status,
        body: data,
      });
    }

    return {
      ok,
      demoCode: pickFirstString(data, ["demoCode", "otp", "code", "verificationCode"]),
      message: pickFirstString(data, ["message", "error"]),
      status: response.status,
      otpSessionId: pickFirstString(data, ["otpSessionId", "sessionToken"]),
    } satisfies OtpRequestResult;
  } catch (error) {
    console.warn("OTP start request failed", error);
    return {
      ok: false,
      message: "Unable to send code. Please try again.",
    } satisfies OtpRequestResult;
  }
}

export async function startOtp(phone: string) {
  const payload = {
    phone: normalizePhone(phone),
  };

  const response = await apiClient.post(API_ENDPOINTS.OTP_START, payload);
  const data = (response.data ?? {}) as Record<string, any>;

  return {
    ok: response.status >= 200 && response.status < 300,
    normalizedPhone: data?.normalizedPhone ?? data?.phone ?? payload.phone,
    ...(data ?? {}),
  };
}

export async function verifyOtp(phone: string, code: string) {
  const normalizedPhone = normalizePhone(phone);

  const res = await apiClient.post(API_ENDPOINTS.OTP_VERIFY, {
    phone: normalizedPhone,
    code,
  });

  const data = res?.data;

  console.log("OTP_VERIFY_RESPONSE", data);

  if (!data?.ok) {
    throw new Error(data?.error?.message || "Verification failed");
  }

  const sessionToken = data?.data?.sessionToken;

  if (!sessionToken) {
    throw new Error("Missing sessionToken");
  }

  setToken(sessionToken);

  const nextPath = data?.data?.nextPath || "/application/start";

  window.location.href = nextPath;

  return data;
}

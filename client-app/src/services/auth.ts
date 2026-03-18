import api, { apiClient } from "../api/client";
import { setToken } from "@/auth/tokenStorage";
import { normalizePhone } from "@/utils/normalizePhone";
import { logClientError, logClientWarning } from "@/lib/logger";

type ApiPayload = Record<string, any> | null;

function unwrapEnvelope(payload: ApiPayload): ApiPayload {
  if (!payload || typeof payload !== "object") return null;
  if (payload.data && typeof payload.data === "object") {
    return payload.data as ApiPayload;
  }
  return payload;
}

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

export type StartOtpResponse = {
  ok: boolean;
  data?: Record<string, unknown>;
  normalizedPhone?: string;
  phone?: string;
  message?: string;
  otpSessionId?: string;
  [key: string]: unknown;
};

export type LoginWithOtpResult = {
  user: Record<string, unknown>;
  authToken: string;
  nextPath?: string;
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
    const response = await api.post("/auth/otp/start", { phone: normalizedPhone });
    const data = (response.data ?? null) as ApiPayload;
    const envelopeData = unwrapEnvelope(data);
    const payloadOk = isOk(data);
    const ok = response.status >= 200 && response.status < 300 && (!hasExplicitOtpStartFlag(data) || payloadOk);

    if (!ok) {
      logClientWarning("OTP start rejected", {
        status: response.status,
        body: data,
      });
    }

    return {
      ok,
      demoCode: pickFirstString(envelopeData, ["demoCode", "otp", "code", "verificationCode"]),
      message: pickFirstString(data, ["message", "error"]) || pickFirstString(envelopeData, ["message", "error"]),
      status: response.status,
      otpSessionId: pickFirstString(envelopeData, ["otpSessionId", "sessionToken"]),
    } satisfies OtpRequestResult;
  } catch (error) {
    logClientWarning("OTP start request failed", error);
    return {
      ok: false,
      message: "Unable to send code. Please try again.",
    } satisfies OtpRequestResult;
  }
}

export async function startOtp(phone: string): Promise<StartOtpResponse> {
  const res = await api.post<any>("/auth/otp/start", { phone: normalizePhone(phone) }, undefined);
  const status = typeof res.status === "number" ? res.status : 200;
  const data = (res.data ?? null) as ApiPayload;
  const envelopeData = unwrapEnvelope(data);
  const payloadOk = isOk(data);
  const sentFlag = typeof envelopeData?.sent === "boolean" ? envelopeData.sent : null;
  const ok = status >= 200 && status < 300 && (sentFlag === null ? payloadOk : sentFlag);

  return {
    ok,
    data: res.data?.data || {},
    ...(res.data?.data || {}),
    message: res.data?.error?.message || res.data?.message,
  } as StartOtpResponse;
}

export async function loginWithOtp(phone: string, code: string): Promise<LoginWithOtpResult> {
  const response = await apiClient.post<any>("/auth/otp/verify", {
    phone: normalizePhone(phone),
    code,
  }, undefined);

  if (!response.data?.ok) {
    throw new Error("OTP failed");
  }

  const token = response.data?.data?.token;
  const user = response.data?.data?.user;
  const nextPath = response.data?.data?.nextPath;

  if (!token) {
    logClientError("OTP verify response missing token", response.data);
    throw new Error("OTP verification returned no token");
  }

  setToken(token);

  return {
    user: user ?? {},
    authToken: token,
    nextPath: typeof nextPath === "string" ? nextPath : undefined,
  };
}

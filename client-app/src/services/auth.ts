import { apiRequest, buildApiUrl } from "../api/client";
import { API_ENDPOINTS } from "../api/endpoints";

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
  applicationToken?: string;
  submittedToken?: string;
};

export function normalizeOtpPhone(phone: string): string {
  const trimmed = String(phone || "").trim();
  if (!trimmed) return "";

  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";

  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return trimmed.startsWith("+") ? `+${digits}` : digits;
}

function hasExplicitOtpStartFlag(payload: ApiPayload): boolean {
  if (!payload || typeof payload !== "object") return false;
  return typeof payload.ok === "boolean" || typeof payload.success === "boolean";
}

export async function requestOtp(phone: string) {
  const normalizedPhone = normalizeOtpPhone(phone);

  let response: Response;
  try {
    response = await fetch(buildApiUrl(API_ENDPOINTS.OTP_START), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: normalizedPhone }),
    });
  } catch (error) {
    console.warn("OTP start request failed", error);
    return {
      ok: false,
      message: "Unable to send code. Please try again.",
    } satisfies OtpRequestResult;
  }

  const rawBody = await response.text();
  let data: ApiPayload = null;
  if (rawBody) {
    try {
      data = JSON.parse(rawBody) as ApiPayload;
    } catch {
      data = { message: rawBody };
    }
  }

  const payloadOk = isOk(data);
  const ok = response.ok && (!hasExplicitOtpStartFlag(data) || payloadOk);

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
}

export async function startOtp(phone: string) {
  return requestOtp(phone);
}

export async function verifyOtp(phone: string, code: string, otpSessionId: string) {
  const formatE164 = (value: string) => {
    const digits = String(value || "").replace(/\D/g, "");
    return digits.startsWith("1") ? `+${digits}` : `+1${digits}`;
  };

  const response = await fetch(buildApiUrl(API_ENDPOINTS.OTP_VERIFY), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: formatE164(phone), code, otpSessionId }),
  });

  if (!response.ok) {
    throw new Error("OTP verification failed");
  }

  const data = (await response.json().catch(() => null)) as ApiPayload;

  return {
    ok: isOk(data),
    sessionToken: pickFirstString(data, ["sessionToken", "accessToken", "token"]),
    applicationToken: pickFirstString(data, ["applicationToken", "submissionId", "leadToken"]),
    submittedToken: pickFirstString(data, ["submittedToken", "portalToken"]),
  } satisfies OtpVerifyResult;
}

import { buildApiUrl } from "../api/client";
import { API_ENDPOINTS } from "../api/endpoints";
import { api } from "@/api/ClientAppAPI";

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
  message?: string;
  status?: number;
};

export function normalizePhone(input: string): string {
  const digits = String(input ?? "").replace(/\D/g, "");

  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}

export const normalizeOtpPhone = normalizePhone;

function hasExplicitOtpStartFlag(payload: ApiPayload): boolean {
  if (!payload || typeof payload !== "object") return false;
  return typeof payload.ok === "boolean" || typeof payload.success === "boolean";
}

export async function requestOtp(phone: string) {
  const normalizedPhone = normalizePhone(phone);

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
  const payload = {
    phone: normalizePhone(phone),
  };

  const response = await fetch(buildApiUrl(API_ENDPOINTS.OTP_START), {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const rawBody = await response.text();
  const data = rawBody ? (JSON.parse(rawBody) as Record<string, any>) : {};

  return {
    ok: response.ok,
    ...(data ?? {}),
  };
}

export async function verifyOtp(phone: string, code: string, otpSessionId: string) {
  return api.post("/api/auth/otp/verify", {
    phone: phone.trim(),
    code: code.trim(),
    otpSessionId,
  });
}

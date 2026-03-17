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

export type StartOtpResponse = {
  ok: boolean;
  normalizedPhone?: string;
  phone?: string;
  message?: string;
  otpSessionId?: string;
  [key: string]: unknown;
};

export type VerifyOtpResponse = {
  ok: boolean;
  sessionToken?: string;
  token?: string;
  applicationToken?: string;
  applicationId?: string;
  submittedToken?: string;
  message?: string;
  [key: string]: unknown;
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

export async function startOtp(phone: string): Promise<StartOtpResponse> {
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

export async function loginWithOtp(phone: string, code: string) {
  const normalizedPhone = normalizePhone(phone);

  const verify = await apiClient.post(API_ENDPOINTS.OTP_VERIFY, {
    phone: normalizedPhone,
    code,
  });

  const otpToken = pickFirstString(verify.data as ApiPayload, ["token", "sessionToken"]);

  if (!otpToken) {
    throw new Error("OTP verification returned no token");
  }

  localStorage.setItem("otp_token", otpToken);

  const session = await apiClient.get("/api/continuation/session", {
    headers: {
      Authorization: `Bearer ${otpToken}`,
    },
  });

  const authToken = pickFirstString(session.data as ApiPayload, ["token", "sessionToken"]);
  const user = (session.data as Record<string, any> | undefined)?.user;

  if (!authToken) {
    throw new Error("Session exchange failed");
  }

  localStorage.removeItem("otp_token");
  setToken(authToken);

  return {
    user,
    authToken,
    session: session.data,
  };
}

export async function verifyOtp(phone: string, code: string): Promise<VerifyOtpResponse> {
  try {
    const { authToken, session } = await loginWithOtp(phone, code);
    const data = (session ?? {}) as Record<string, any>;
    const payload = (data.data ?? {}) as Record<string, any>;

    return {
      ok: true,
      sessionToken: authToken,
      token: authToken,
      applicationToken: pickFirstString(payload, ["applicationToken", "applicationId"])
        || pickFirstString(data, ["applicationToken", "applicationId"])
        || undefined,
      applicationId: pickFirstString(payload, ["applicationId"]) || pickFirstString(data, ["applicationId"]) || undefined,
      submittedToken: pickFirstString(payload, ["submittedToken"]) || pickFirstString(data, ["submittedToken"]) || undefined,
      message: pickFirstString(data, ["message", "error"])
        || pickFirstString(data?.error as ApiPayload, ["message"])
        || undefined,
      ...payload,
      ...data,
    };
  } catch (error: any) {
    const payload = (error?.response?.data ?? null) as ApiPayload;
    return {
      ok: false,
      message: pickFirstString(payload, ["message", "error"]) || error?.message || "Verification failed",
    };
  }
}

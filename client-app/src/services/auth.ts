import api, { apiClient } from "../api/client";
import { setToken } from "@/auth/tokenStorage";
import { normalizePhone } from "@/utils/normalizePhone";

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
  data?: Record<string, unknown>;
  normalizedPhone?: string;
  phone?: string;
  message?: string;
  otpSessionId?: string;
  [key: string]: unknown;
};

export type VerifyOtpData = {
  token?: string;
  user?: Record<string, unknown>;
  nextPath?: string;
  applicationToken?: string;
  applicationId?: string;
  submittedToken?: string;
  [key: string]: unknown;
};

export type VerifyOtpResponse = {
  success?: boolean;
  ok: boolean;
  data?: VerifyOtpData;
  error?: string;
  sessionToken?: string;
  token?: string;
  nextPath?: string;
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
    const response = await api.post("/auth/otp/start", { phone: normalizedPhone });
    const data = (response.data ?? null) as ApiPayload;
    const envelopeData = unwrapEnvelope(data);
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
      demoCode: pickFirstString(envelopeData, ["demoCode", "otp", "code", "verificationCode"]),
      message: pickFirstString(data, ["message", "error"]) || pickFirstString(envelopeData, ["message", "error"]),
      status: response.status,
      otpSessionId: pickFirstString(envelopeData, ["otpSessionId", "sessionToken"]),
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
  const res = await api.post<any>("/auth/otp/start", { phone: normalizePhone(phone) }, undefined);

  return {
    ok: Boolean(res.data?.ok && res.data?.data?.sent),
    data: res.data?.data || {},
    ...(res.data?.data || {}),
    message: res.data?.error?.message || res.data?.message,
  } as StartOtpResponse;
}

export async function loginWithOtp(phone: string, code: string) {
  const verify = await api.post<any>("/auth/otp/verify", {
    phone: normalizePhone(phone),
    code,
  });

  if (!verify.data?.ok) {
    throw new Error("OTP verification failed");
  }

  const otpToken = verify.data?.data?.token;

  if (!otpToken) {
    console.error("OTP verify response", verify.data);
    throw new Error("OTP verification returned no token");
  }

  const session = await api.get<any>("/continuation/session", {
    headers: {
      Authorization: `Bearer ${otpToken}`,
    },
  });

  if (!session.data?.ok) {
    throw new Error("Session exchange failed");
  }

  const authToken = session.data?.data?.token;
  const user = session.data?.data?.user;

  if (!authToken) {
    throw new Error("Session token missing");
  }

  setToken(authToken);

  return {
    user,
    authToken,
    session: session.data,
  };
}

export async function verifyOtp(phone: string, code: string): Promise<VerifyOtpResponse> {
  const res = await apiClient.post("/auth/otp/verify", { phone: normalizePhone(phone), code }, undefined);

  if (res.data?.error && typeof res.data.error === "object") {
    res.data.message = res.data.error.message || res.data.message;
  }

  if (
    res.data?.ok === true &&
    res.data?.data &&
    (res.data.data.token || res.data.data.sessionToken) &&
    res.data.data.user
  ) {
    const token = res.data.data.token || res.data.data.sessionToken;

    localStorage.setItem("auth_token", token);

    return {
      ...res.data,
      success: true,
      nextPath: res.data.data.nextPath || "/portal",
    };
  }

  return {
    ...res.data,
    success: false,
  };
}

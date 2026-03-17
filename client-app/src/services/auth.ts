import api, { apiClient } from "../api/client";
import { API_ENDPOINTS } from "../api/endpoints";
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
    const response = await apiClient.post(API_ENDPOINTS.OTP_START, { phone: normalizedPhone });
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
  const res = await api.post<any>("/auth/otp/start", { phone: normalizePhone(phone) });

  return {
    ok: Boolean(res.data?.ok && res.data?.data?.sent),
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
  try {
    const verify = await api.post<any>("/auth/otp/verify", {
      phone: normalizePhone(phone),
      code,
    });

    const payload = (verify?.data?.data ?? {}) as Record<string, any>;
    const sessionToken = pickFirstString(payload, ["sessionToken", "token"]);

    return {
      ok: Boolean(verify?.data?.ok && sessionToken),
      sessionToken,
      token: sessionToken,
      nextPath: pickFirstString(payload, ["nextPath"]),
      applicationToken: pickFirstString(payload, ["applicationToken", "applicationId"])
        || pickFirstString(verify?.data, ["applicationToken", "applicationId"])
        || undefined,
      applicationId: pickFirstString(payload, ["applicationId"]) || pickFirstString(verify?.data, ["applicationId"]) || undefined,
      submittedToken: pickFirstString(payload, ["submittedToken"]) || pickFirstString(verify?.data, ["submittedToken"]) || undefined,
      message: pickFirstString(verify?.data, ["message", "error"])
        || pickFirstString(verify?.data?.error as ApiPayload, ["message"])
        || undefined,
      ...payload,
      ...verify?.data,
    };
  } catch (error: any) {
    const payload = (error?.response?.data ?? null) as ApiPayload;
    return {
      ok: false,
      message: pickFirstString(payload, ["message", "error"]) || error?.message || "Verification failed",
    };
  }
}

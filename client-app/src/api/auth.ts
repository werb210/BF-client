// BF_CLIENT_BLOCK_v155_OTP_FALLTHROUGH_COMPAT_v1
// After BF-Server v145, OTP verify falls through to a client
// JWT mint when the phone has no users row. Wizard-side code
// continues to read { data: { token } } from the response —
// no shape change required. This sentinel records that the
// compat audit ran cleanly.
import { apiRequest } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";
import { clearToken, getToken, setToken } from "@/auth/token";

type AuthUser = Record<string, unknown> | null;

export function sendOtp(phone: string) {
  return apiRequest(endpoints.otpStart, {
    method: "POST",
    body: { phone },
  });
}

export async function verifyOtp(phone: string, code: string) {
  let data: { token?: string };
  try {
    data = await apiRequest<{ token?: string }>(endpoints.otpVerify, {
      method: "POST",
      body: { phone, code },
    });
  } catch (error: any) {
    if (error?.status === 401) {
      const expiredError = new Error("Code expired or incorrect. Request a new code.") as Error & {
        status?: number;
      };
      expiredError.status = 401;
      throw expiredError;
    }
    throw error;
  }

  if (data?.token) {
    setToken(data.token);
  }

  return data;
}

export function hasToken() {
  return Boolean(getToken());
}

export { clearToken, getToken, setToken };

export async function getMe(): Promise<AuthUser> {
  if (!hasToken()) {
    return null;
  }

  try {
    return await apiRequest("/api/auth/me");
  } catch {
    return null;
  }
}

export async function initAuth() {
  const token = getToken();
  if (!token) {
    clearToken();
  }
}

export const startOtp = sendOtp;

import { apiCall } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";
import { clearToken, getToken, setToken } from "@/auth/token";

type AuthUser = Record<string, unknown> | null;

export function sendOtp(phone: string) {
  return apiCall(endpoints.otpStart, {
    method: "POST",
    body: JSON.stringify({ phone }),
  });
}

export function verifyOtp(phone: string, code: string) {
  return apiCall(endpoints.otpVerify, {
    method: "POST",
    body: JSON.stringify({ phone, code }),
  });
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
    return await apiCall("/api/auth/me");
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

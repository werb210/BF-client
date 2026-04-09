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

export function verifyOtp(phone: string, code: string) {
  return apiRequest(endpoints.otpVerify, {
    method: "POST",
    body: { phone, code },
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

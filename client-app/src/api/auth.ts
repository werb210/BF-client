import { apiRequest } from "@/lib/api";
import { clearToken, getToken, setToken } from "@/auth/token";

type AuthUser = Record<string, unknown> | null;

export function sendOtp(phone: string) {
  return apiRequest("/auth/send-otp", {
    method: "POST",
    body: { phone },
  });
}

export function verifyOtp(phone: string, code: string) {
  return apiRequest("/auth/verify-otp", {
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
    return await apiRequest("/auth/me");
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

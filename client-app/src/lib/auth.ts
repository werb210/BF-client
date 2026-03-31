import { apiFetch, clearToken, getToken as getApiToken, setToken as setApiToken } from "./api";
import { saveToken } from "@/services/token";

let currentUser: any = null;

export { clearToken };

export function setToken(token: string) {
  saveToken(token);
  setApiToken(token);
}

export function getToken() {
  return getApiToken();
}

export async function initAuth() {
  try {
    currentUser = await apiFetch("/api/auth/me");
  } catch {
    clearToken();
    currentUser = null;
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }
}

export async function startOtp(phone: string) {
  return apiFetch("/api/auth/start-otp", {
    method: "POST",
    body: JSON.stringify({ phone }),
  });
}

export async function verifyOtp(phone: string, code: string) {
  const payload = { phone, code };
  const res = await apiFetch<{ token?: string; user?: unknown }>("/api/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!res.token || res.token.trim() === "") {
    throw new Error("[AUTH FAILED]");
  }

  saveToken(res.token);

  currentUser = res.user || null;
  return res;
}

export function getUser() {
  return currentUser;
}

export async function getMe() {
  if (currentUser) {
    return currentUser;
  }

  try {
    currentUser = await apiFetch("/api/auth/me");
  } catch {
    clearToken();
    currentUser = null;
  }

  return currentUser;
}

export function hasToken() {
  return Boolean(getApiToken());
}

export function logout() {
  clearToken();
  currentUser = null;
}

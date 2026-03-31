import { apiFetch, clearToken } from "./api";
import { saveToken } from "@/services/token";

let currentUser: any = null;

export { clearToken };

export function setToken(token: string) {
  saveToken(token);
}

export function getToken() {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem("token");
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
  return apiFetch("/api/auth/otp/start", {
    method: "POST",
    body: JSON.stringify({ phone }),
  });
}

export async function verifyOtp(phone: string, code: string) {
  const payload = { phone, code };
  const res = await apiFetch<{ token?: string; user?: unknown }>("/api/auth/verify", {
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
  if (typeof localStorage === "undefined") return false;
  return Boolean(localStorage.getItem("token"));
}

export function logout() {
  clearToken();
  currentUser = null;
}

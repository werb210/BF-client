import { apiFetch, clearToken as clearApiToken, setToken as setApiToken } from "./api";

const TOKEN_KEY = "auth_token";
const LEGACY_TOKEN_KEY = "token";

let currentUser: any = null;

export function setToken(token: string) {
  setApiToken(token);
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(LEGACY_TOKEN_KEY, token);
  localStorage.setItem("bf_token", token);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY);
}

export function hasToken() {
  return Boolean(getToken());
}

export async function startOtp(phone: string) {
  return apiFetch("/api/auth/otp/start", {
    method: "POST",
    body: JSON.stringify({ phone }),
  });
}

export async function verifyOtp(phone: string, code: string) {
  const res: any = await apiFetch("/api/auth/otp/verify", {
    method: "POST",
    body: JSON.stringify({ phone, code }),
  });

  const token = res?.token || res?.data?.token;
  if (token) {
    setToken(token);
  }

  currentUser = res?.user || res?.data?.user || null;
  return res;
}

export async function getMe() {
  if (!currentUser) {
    try {
      currentUser = await apiFetch("/api/auth/me");
    } catch {
      currentUser = null;
    }
  }

  return currentUser;
}

export function clearToken() {
  clearApiToken();
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  localStorage.removeItem("bf_token");
}

export function logout() {
  clearToken();
  currentUser = null;
}

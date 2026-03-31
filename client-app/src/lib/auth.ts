import { apiFetch, setToken, clearToken, loadToken } from "./api";

let currentUser: any = null;

export { setToken, clearToken };

export function getToken() {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem("token");
}

export async function initAuth() {
  loadToken();

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
  const res = await apiFetch("/api/auth/otp/verify", {
    method: "POST",
    body: JSON.stringify({ phone, code }),
  });

  if ((res as any)?.token) {
    setToken((res as any).token);
  }

  currentUser = (res as any)?.user || null;
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

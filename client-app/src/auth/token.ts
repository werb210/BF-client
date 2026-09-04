const STORAGE_KEY = "bf_jwt_token";
import { Capacitor } from "@capacitor/core";
import { credentialStore } from "./credentialStore";
let token: string | null = null;

export async function hydrateToken(): Promise<void> {
  token = await credentialStore.get();
}

export function getToken(): string | null {
  if (token) return token;
  if (Capacitor.isNativePlatform()) return null;
  if (typeof window === "undefined") return null;
  // BF_CLIENT_BLOCK_v865_STORAGE_SAFE — getToken() is called by the API client
  // on EVERY request, including the submit POST. Blocked localStorage must not
  // throw here, or submission dies before the request is even sent. Fall back to
  // the in-memory token captured during this session's OTP login.
  try {
    // Migrate legacy "auth_token" key on first read
    const legacy = localStorage.getItem("auth_token");
    if (legacy) {
      localStorage.setItem(STORAGE_KEY, legacy);
      localStorage.removeItem("auth_token");
      token = legacy;
      return token;
    }
    token = localStorage.getItem(STORAGE_KEY);
    return token;
  } catch {
    return token;
  }
}

export function setToken(t: string): void {
  token = t;
  void credentialStore.set(t).catch((error) => {
    console.error("Secure credential persistence failed", error);
  });
  if (Capacitor.isNativePlatform()) return;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, t);
      localStorage.removeItem("auth_token"); // clean up legacy key
    } catch {
      /* BF_CLIENT_BLOCK_v865_STORAGE_SAFE — token kept in-memory for the session */
    }
  }
}

export function clearToken(): void {
  token = null;
  void credentialStore.clear().catch((error) => {
    console.error("Secure credential clear failed", error);
  });
  if (Capacitor.isNativePlatform()) return;
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem("auth_token");
    } catch {
      /* BF_CLIENT_BLOCK_v865_STORAGE_SAFE */
    }
  }
}

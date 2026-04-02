import { env } from "@/config/env";
import { safeStorage } from "@/lib/storage";

export function getToken(): string | null {
  return safeStorage.getLocal(env.JWT_STORAGE_KEY);
}

export function setToken(token: string) {
  safeStorage.setLocal(env.JWT_STORAGE_KEY, token);
}

export function clearToken() {
  safeStorage.removeLocal(env.JWT_STORAGE_KEY);
}

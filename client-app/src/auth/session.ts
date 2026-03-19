import { getAccessToken } from "@/services/token";

export function getOtpSession(): string | null {
  try {
    return getAccessToken();
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.clear();
  sessionStorage.clear();
}

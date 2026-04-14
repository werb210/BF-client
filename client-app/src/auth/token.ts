const STORAGE_KEY = "bf_jwt_token";
let token: string | null = null;

export function getToken(): string | null {
  if (token) return token;
  if (typeof window === "undefined") return null;
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
}

export function setToken(t: string): void {
  token = t;
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, t);
    localStorage.removeItem("auth_token"); // clean up legacy key
  }
}

export function clearToken(): void {
  token = null;
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("auth_token");
  }
}

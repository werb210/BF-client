const KEY = "bf_jwt_token";
const AUTH_KEY = "auth_token";
let token: string | null = null;

export function getToken() {
  if (token) return token;

  if (typeof window === "undefined") return null;

  token = localStorage.getItem(AUTH_KEY) || localStorage.getItem(KEY);
  return token;
}

export function setToken(t: string) {
  token = t;

  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, t);
    localStorage.setItem(AUTH_KEY, t);
  }
}

export function clearToken() {
  token = null;

  if (typeof window !== "undefined") {
    localStorage.removeItem(KEY);
    localStorage.removeItem(AUTH_KEY);
  }
}

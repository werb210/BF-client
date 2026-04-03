const KEY = "token";
let token: string | null = null;

export function getToken() {
  if (token) return token;

  if (typeof window === "undefined") return null;

  token = localStorage.getItem(KEY);
  return token;
}

export function setToken(t: string) {
  token = t;

  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, t);
  }
}

export function clearToken() {
  token = null;

  if (typeof window !== "undefined") {
    localStorage.removeItem(KEY);
  }
}

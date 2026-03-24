const TOKEN_KEY = "bf_token";
const FALLBACK_TOKEN_KEY = "token";

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(FALLBACK_TOKEN_KEY, token);
}

export function getToken() {
  return localStorage.getItem(FALLBACK_TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
}

export function hasToken() {
  return Boolean(getToken());
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(FALLBACK_TOKEN_KEY);
}

const KEY = "bf_session_token";

export function setSession(token: string) {
  localStorage.setItem(KEY, token);
}

export function getSession() {
  return localStorage.getItem(KEY);
}

export function clearSession() {
  localStorage.removeItem(KEY);
}

export function isAuthenticated() {
  return !!getSession();
}

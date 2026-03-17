const TOKEN_KEY = "auth_token";
const LEGACY_TOKEN_KEY = "boreal_client_token";

export function getToken(): string | null {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    return token;
  }

  const legacyToken = sessionStorage.getItem(LEGACY_TOKEN_KEY);
  if (legacyToken) {
    localStorage.setItem(TOKEN_KEY, legacyToken);
    sessionStorage.removeItem(LEGACY_TOKEN_KEY);
    return legacyToken;
  }

  return null;
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  sessionStorage.removeItem(LEGACY_TOKEN_KEY);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(LEGACY_TOKEN_KEY);
}

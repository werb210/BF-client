let token: string | null = null;

export function getToken() {
  return token;
}

export function setToken(t: string) {
  token = t;
}

export function clearToken() {
  token = null;
}

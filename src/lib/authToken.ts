import { ENV } from '../config/env';

export function getToken(): string | null {
  return localStorage.getItem(ENV.JWT_STORAGE_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(ENV.JWT_STORAGE_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(ENV.JWT_STORAGE_KEY);
}

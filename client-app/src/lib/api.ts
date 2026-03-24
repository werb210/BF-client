// src/lib/api.ts

import { runtimeConfig } from '../config/runtimeConfig';

function assertApiBase() {
  if (!runtimeConfig.API_BASE) {
    throw new Error('API base URL is not configured');
  }
}

export function buildUrl(path: string): string {
  assertApiBase();

  if (!path.startsWith('/')) {
    throw new Error(`Invalid API path: ${path}`);
  }

  return `${runtimeConfig.API_BASE}${path}`;
}

function getAuthToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return localStorage.getItem('token') || localStorage.getItem('bf_token');
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = buildUrl(path);
  const token = getAuthToken();
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers = new Headers(options.headers || {});

  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(url, {
    credentials: 'include',
    ...options,
    headers,
  });

  const contentType = res.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await res.json() : null;

  if (!res.ok) {
    const message = payload?.error || payload?.message || 'Request failed';
    throw new Error(message);
  }

  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload.data as T;
  }

  return payload as T;
}

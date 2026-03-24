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
  const token = getAuthToken();
  if (!token && path.startsWith('/api/') && !path.includes('/auth/')) {
    throw new Error('Missing auth token');
  }

  const url = buildUrl(path);
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

  let json: any;
  try {
    json = await res.json();
  } catch {
    throw new Error('Invalid API response shape');
  }

  if (!res.ok) {
    throw new Error(json?.error || 'Request failed');
  }

  if (!json || json.ok !== true || !('data' in json)) {
    throw new Error('Invalid API response shape');
  }

  return json.data as T;
}

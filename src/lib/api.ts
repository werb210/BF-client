import { ENV } from '../config/env';
import { getToken } from './authToken';

export type ApiResponse<T> = {
  status: 'ok' | 'error' | 'not_ready';
  data?: T;
  error?: string;
  rid?: string;
};

export type RequestOptions = {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

export async function api<T = unknown>(path: string, options?: RequestOptions): Promise<T> {
  const token = getToken();

  const res = await fetch(`${ENV.API_URL}${path}`, {
    method: options?.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers || {}),
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
    signal: options?.signal,
  });

  const json: ApiResponse<T> = await res.json();

  if (json.status !== 'ok') {
    throw new Error(json.error || 'API error');
  }

  return json.data as T;
}

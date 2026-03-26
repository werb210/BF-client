import api, { buildUrl, request } from '@/lib/api';

export const apiClient = api;

const isAbsoluteUrl = (value: string): boolean => /^https?:\/\//i.test(value);

export async function apiRequest<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  if (isAbsoluteUrl(path)) {
    const res = await fetch(path, options);
    if (!res.ok) {
      throw new Error(`API error ${res.status}`);
    }
    return res.json() as Promise<T>;
  }

  return request(path, options) as Promise<T>;
}

const buildMethodOptions = (method: string, data?: unknown, headers?: Record<string, string>) => {
  const isForm = typeof FormData !== 'undefined' && data instanceof FormData;

  return {
    method,
    body: data == null ? undefined : isForm ? (data as BodyInit) : JSON.stringify(data),
    headers: isForm ? headers : { 'Content-Type': 'application/json', ...(headers || {}) },
  } as RequestInit;
};

const client = {
  interceptors: {
    request: { use: (_onFulfilled?: (config: RequestInit) => RequestInit, _onRejected?: (error: unknown) => unknown) => undefined },
    response: { use: (_onFulfilled?: (response: unknown) => unknown, _onRejected?: (error: unknown) => unknown) => undefined },
  },
  async request<T = unknown>(config: any): Promise<{ data: T; status: number; headers: Headers }> {
    const data = await apiRequest<T>(config.url, buildMethodOptions((config.method || 'GET').toUpperCase(), config.data, config.headers));
    return { data, status: 200, headers: new Headers() };
  },
  async get<T = unknown>(url: string): Promise<{ data: T; status: number }> {
    return { data: await apiRequest<T>(url), status: 200 };
  },
  async post<T = unknown>(url: string, data?: unknown, config?: any): Promise<{ data: T; status: number }> {
    return { data: await apiRequest<T>(url, buildMethodOptions('POST', data, config?.headers)), status: 200 };
  },
  async patch<T = unknown>(url: string, data?: unknown, config?: any): Promise<{ data: T; status: number }> {
    return { data: await apiRequest<T>(url, buildMethodOptions('PATCH', data, config?.headers)), status: 200 };
  },
  async put<T = unknown>(url: string, data?: unknown, config?: any): Promise<{ data: T; status: number }> {
    return { data: await apiRequest<T>(url, buildMethodOptions('PUT', data, config?.headers)), status: 200 };
  },
  async delete<T = unknown>(url: string): Promise<{ data: T; status: number }> {
    return { data: await apiRequest<T>(url, { method: 'DELETE' }), status: 200 };
  },
};

export function buildApiUrl(path: string): string {
  return buildUrl(path);
}

export default client;

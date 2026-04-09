const BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'https://server.boreal.financial';

type ApiOptions = Omit<RequestInit, 'body' | 'headers'> & {
  body?: unknown;
  headers?: Record<string, string>;
};

export async function api<T = unknown>(path: string, options: ApiOptions = {}): Promise<T> {
  const token = localStorage.getItem('auth_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers ?? {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
    body:
      options.body === undefined
        ? undefined
        : typeof options.body === 'string'
          ? options.body
          : JSON.stringify(options.body),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorText = data?.error || data?.message || `Request failed for ${path}`;
    throw new Error(`API ERROR ${res.status}: ${errorText}`);
  }

  if (path.includes('/api/auth/otp/verify')) {
    const nextToken = data?.data?.token || data?.token;

    if (nextToken) {
      localStorage.setItem('auth_token', nextToken);
    }
  }

  return (data?.data ?? data) as T;
}

// Backward-compatible aliases
export const apiCall = api;

export async function apiSubmit(url: string, data: unknown) {
  return api(url, {
    method: 'POST',
    body: data,
  });
}

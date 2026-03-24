function normalizeApiPath(path: string): string {
  if (!path.startsWith('/')) {
    throw new Error(`Invalid API path: ${path}`);
  }

  return path.startsWith('/api') ? path : `/api${path}`;
}

export function buildUrl(path: string): string {
  return normalizeApiPath(path);
}

export async function apiRequest(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token') || localStorage.getItem('bf_token');

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(normalizeApiPath(path), {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }

  const json = await res.json();

  return json?.data ?? json;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  return (await apiRequest(path, options)) as T;
}

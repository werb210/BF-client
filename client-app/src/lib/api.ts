function normalizeApiPath(path: string): string {
  if (!path.startsWith('/')) {
    throw new Error(`Invalid API path: ${path}`);
  }

  return path.startsWith('/api') ? path : `/api${path}`;
}

function buildRequestUrl(path: string): string {
  const normalizedPath = normalizeApiPath(path);
  return new URL(normalizedPath, window.location.origin).toString();
}

export function buildUrl(path: string): string {
  return normalizeApiPath(path);
}

export async function apiRequest<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
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

  const res = await fetch(buildRequestUrl(path), {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }

  if (res.status === 204) {
    return null as T;
  }

  const json = await res.json();

  return (json?.data ?? json) as T;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  return apiRequest<T>(path, options);
}

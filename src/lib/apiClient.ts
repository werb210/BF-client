import { getApiUrl } from '@/config/env';

export async function apiClient<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${getApiUrl()}${path}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  const json = await res.json();

  if (!res.ok || json?.success === false) {
    throw new Error(json?.error?.message || 'API error');
  }

  return json.data;
}

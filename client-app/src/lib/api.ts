const BASE_URL = import.meta.env.VITE_API_URL;

if (!BASE_URL) {
  throw new Error('Missing VITE_API_URL');
}

export const request = async (path: string, options: RequestInit = {}) => {
  if (path.startsWith('/api')) {
    throw new Error('Remove /api prefix');
  }

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include',
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  return res.json();
};


export const apiRequest = <T = unknown>(path: string, options: RequestInit = {}) => request(path, options) as Promise<T>;

const api = {
  get: <T = unknown>(path: string) => request(path) as Promise<T>,
  post: <T = unknown>(path: string, body?: any) =>
    request(path, {
      method: 'POST',
      body: JSON.stringify(body),
    }) as Promise<T>,
};

export const buildUrl = (path: string): string => `${BASE_URL}${path}`;

export default api;

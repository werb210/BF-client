const API_BASE = import.meta.env.VITE_API_URL;

function getToken() {
  return localStorage.getItem('token');
}

export async function apiCall(path: string, options: RequestInit = {}) {
  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
    body: options.body
      ? typeof options.body === 'string'
        ? options.body
        : JSON.stringify(options.body)
      : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }

  const json = await res.json();
  return json?.data ?? json;
}

/* backward compatibility */
export async function apiSubmit(url: string, data: any) {
  return apiCall(url, {
    method: 'POST',
    body: data,
  });
}

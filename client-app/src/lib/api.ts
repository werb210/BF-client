const BASE_URL = "https://boreal-staff-server-e4hmaqbkb2g5hgfv.canadacentral-01.azurewebsites.net";

export async function apiRequest(path: string, options: any = {}) {
  const token = localStorage.getItem("token");

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json?.error || "API request failed");
  }

  return json;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  return apiRequest(path, options) as Promise<T>;
}

export function buildUrl(path: string): string {
  return path;
}

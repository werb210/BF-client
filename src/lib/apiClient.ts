const API_URL = import.meta.env.VITE_API_URL;

type ApiResponse<T> = {
  data?: T;
  error?: string;
};

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const json: ApiResponse<T> = await res.json();

  if (!res.ok) {
    throw new Error(json.error || "API_ERROR");
  }

  if (!json.data) {
    throw new Error("NO_DATA_RETURNED");
  }

  return json.data;
}

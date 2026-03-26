const API_BASE_URL = import.meta.env.VITE_API_URL || "";

function isFormDataBody(body: BodyInit | null | undefined): body is FormData {
  return typeof FormData !== "undefined" && body instanceof FormData;
}

function hasJsonContentType(headers: Headers): boolean {
  return headers.get("Content-Type")?.includes("application/json") ?? false;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem("token");
  const url = `${API_BASE_URL}${path}`;
  const headers = new Headers(options.headers ?? {});

  const requestBody = options.body;
  const isFormBody = isFormDataBody(requestBody);
  const shouldSerializeBody =
    requestBody != null &&
    !isFormBody &&
    typeof requestBody !== "string" &&
    !(requestBody instanceof Blob) &&
    !(requestBody instanceof URLSearchParams) &&
    !(requestBody instanceof ArrayBuffer);

  if (!isFormBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      body: shouldSerializeBody ? JSON.stringify(requestBody) : requestBody,
    });

    const responseText = await res.text();
    const responseData =
      responseText && hasJsonContentType(res.headers)
        ? (JSON.parse(responseText) as T)
        : ((responseText as unknown) as T);

    if (!res.ok) {
      console.error("API error:", res.status, responseText);
      throw new Error(`API error ${res.status}`);
    }

    return responseData;
  } catch (err) {
    console.error("Fetch failed:", err);
    throw err;
  }
}

export async function apiRequest<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  return apiFetch<T>(path, options);
}

export function buildUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

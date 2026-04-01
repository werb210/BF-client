const base = import.meta.env.VITE_API_URL;

if (import.meta.env.MODE !== "test" && !base) {
  throw new Error("VITE_API_URL is required");
}

export async function api<T = unknown>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${base}${path}`, opts);
  const json = (await res.json()) as { status: "ok" | "error"; data?: T; error?: string };

  if (!res.ok) {
    throw new Error(json.error ?? `API error ${res.status}`);
  }

  if (json.status === "error") {
    throw new Error(json.error ?? "Unknown API error");
  }

  return (json.data ?? ({} as T)) as T;
}

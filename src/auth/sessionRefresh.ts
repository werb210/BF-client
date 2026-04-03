import { apiRequest } from "../lib/api";
import { setToken } from "../lib/authToken";

let refreshPromise: Promise<boolean> | null = null;

export async function refreshSession(): Promise<boolean> {
  if (refreshPromise) return false;

  refreshPromise = (async () => {
    try {
      const res = await apiRequest<{ token: string }>("/api/v1/auth/refresh", {
        method: "POST",
      });

      if (!res?.token) return false;

      setToken(res.token);
      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

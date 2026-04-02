import { apiCall } from "@/lib/api";
import { clearToken, setToken } from "@/auth/token";

let refreshInFlight = false;

export async function refreshSession(): Promise<boolean> {
  if (refreshInFlight) {
    return false;
  }

  refreshInFlight = true;

  try {
    const res = await apiCall<{ token?: string }>("/api/auth/refresh", {
      method: "POST",
    });

    if (res?.token) {
      setToken(res.token);
      return true;
    }

    clearToken();
    return false;
  } catch {
    clearToken();
    return false;
  } finally {
    refreshInFlight = false;
  }
}

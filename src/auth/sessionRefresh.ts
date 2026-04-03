import { apiRequest } from "../lib/api";

let refreshInFlight: Promise<boolean> | null = null;

export async function refreshSession(): Promise<boolean> {
  if (refreshInFlight) {
    return false; // block nested
  }

  refreshInFlight = (async () => {
    try {
      const data = await apiRequest<{ token: string }>(
        "/api/v1/auth/refresh",
        { method: "POST" }
      );

      if (data?.token) {
        localStorage.setItem("token", data.token);
        return true;
      }

      return false;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

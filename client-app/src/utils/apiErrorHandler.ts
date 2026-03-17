import { logClientError } from "@/lib/logger";

export function handleApiError(err: any) {
  if (err?.response?.status === 401) {
    localStorage.removeItem("auth_token");
    sessionStorage.removeItem("boreal_client_token");
    window.location.reload();
  }

  logClientError("API error", err);
}

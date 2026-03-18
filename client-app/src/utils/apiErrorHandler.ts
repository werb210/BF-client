import { clearToken } from "@/lib/auth";
import { logClientError } from "@/lib/logger";

export function handleApiError(err: any) {
  if (err?.response?.status === 401) {
    clearToken();
    sessionStorage.removeItem("boreal_client_token");
    window.location.reload();
  }

  logClientError("API error", err);
}

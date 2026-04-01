import { apiCall } from "../api/client";
import { hasToken } from "@/api/auth";
import { API_ENDPOINTS_CONTRACT } from "@/contracts";

export async function updateApplication(payload: unknown) {
  if (!hasToken()) return;

  const data = await apiCall(API_ENDPOINTS_CONTRACT.APPLICATION.UPDATE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!data) {
    return { ok: false };
  }

  return data;
}

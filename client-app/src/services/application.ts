import { apiRequest } from "../api/client";
import { getToken } from "@/auth/tokenStorage";

export async function updateApplication(payload: any) {
  if (!getToken()) return;

  const data = await apiRequest("/api/application/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!data) {
    return { ok: false };
  }

  return data;
}

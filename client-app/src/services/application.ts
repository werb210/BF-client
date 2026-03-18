import { apiRequest } from "../api/client";
import { hasToken } from "@/lib/auth";

export async function updateApplication(payload: any) {
  if (!hasToken()) return;

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

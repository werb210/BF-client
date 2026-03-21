import { apiRequest } from "../api/client";
import { hasToken } from "@/lib/auth";
import { API_CONTRACT } from "@/contracts";

export async function updateApplication(payload: any) {
  if (!hasToken()) return;

  const data = await apiRequest(API_CONTRACT.APPLICATION.UPDATE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!data) {
    return { ok: false };
  }

  return data;
}

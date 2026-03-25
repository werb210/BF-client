import { apiRequest } from "../api/client";
import { API_ENDPOINTS_CONTRACT } from "@/contracts";
import { hasToken } from "@/lib/auth";

export async function createApplication(data: unknown) {
  return apiRequest(API_ENDPOINTS_CONTRACT.APPLICATION.ROOT, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateApplication(data: unknown) {
  if (!hasToken()) return;

  return apiRequest(API_ENDPOINTS_CONTRACT.APPLICATION.UPDATE, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getContinuation() {
  return apiRequest(API_ENDPOINTS_CONTRACT.APPLICATION.CONTINUATION);
}

import { apiCall } from "../api/client";
import { API_ENDPOINTS_CONTRACT } from "@/contracts";
import { hasToken } from "@/api/auth";

export async function createApplication(data: unknown) {
  return apiCall(API_ENDPOINTS_CONTRACT.APPLICATION.ROOT, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateApplication(data: unknown) {
  if (!hasToken()) return;

  return apiCall(API_ENDPOINTS_CONTRACT.APPLICATION.UPDATE, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getContinuation() {
  return apiCall(API_ENDPOINTS_CONTRACT.APPLICATION.CONTINUATION);
}

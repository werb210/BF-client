import { apiCall } from "./client";
import { API_ENDPOINTS_CONTRACT } from "@/contracts";
import { hasToken } from "@/api/auth";

export function createApplication(data: unknown) {
  return apiCall(API_ENDPOINTS_CONTRACT.APPLICATION.ROOT, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateApplication(data: unknown) {
  if (!hasToken()) return;

  return apiCall(API_ENDPOINTS_CONTRACT.APPLICATION.UPDATE, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getContinuation() {
  return apiCall(API_ENDPOINTS_CONTRACT.APPLICATION.CONTINUATION);
}

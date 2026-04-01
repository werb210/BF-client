import { apiCall } from "./client";
import { API_ENDPOINTS_CONTRACT } from "@/contracts";
import { hasToken } from "@/api/auth";

export async function getContinuation() {
  return apiCall(API_ENDPOINTS_CONTRACT.APPLICATION.CONTINUATION);
}

export async function updateApplication(payload: unknown) {
  if (!hasToken()) return;

  return apiCall(API_ENDPOINTS_CONTRACT.APPLICATION.UPDATE, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function createApplication(payload: unknown) {
  return apiCall(API_ENDPOINTS_CONTRACT.APPLICATION.ROOT, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function submitReadiness(payload: unknown) {
  return apiCall(API_ENDPOINTS_CONTRACT.READINESS.ROOT, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function continueReadiness(payload: unknown) {
  return apiCall(API_ENDPOINTS_CONTRACT.READINESS.CONTINUE, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function getReadinessSession(sessionId: string) {
  return apiCall(`${API_ENDPOINTS_CONTRACT.READINESS.SESSION_PREFIX}${encodeURIComponent(sessionId)}`);
}

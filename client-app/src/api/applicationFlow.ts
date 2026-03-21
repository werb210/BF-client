import { apiRequest } from "./client";
import { API_CONTRACT } from "@/contracts";
import { hasToken } from "@/lib/auth";

export async function getContinuation() {
  return apiRequest(API_CONTRACT.APPLICATION.CONTINUATION);
}

export async function updateApplication(payload: unknown) {
  if (!hasToken()) return;

  return apiRequest(API_CONTRACT.APPLICATION.UPDATE, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function createApplication(payload: unknown) {
  return apiRequest(API_CONTRACT.APPLICATION.ROOT, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function submitReadiness(payload: unknown) {
  return apiRequest(API_CONTRACT.READINESS.ROOT, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function continueReadiness(payload: unknown) {
  return apiRequest(API_CONTRACT.READINESS.CONTINUE, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function getReadinessSession(sessionId: string) {
  return apiRequest(`${API_CONTRACT.READINESS.SESSION_PREFIX}${encodeURIComponent(sessionId)}`);
}

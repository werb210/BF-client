import { apiRequest } from "./client";
import { hasToken } from "@/lib/auth";

export async function getContinuation() {
  return apiRequest("/api/application/continuation");
}

export async function updateApplication(payload: unknown) {
  if (!hasToken()) return;

  return apiRequest("/api/application/update", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function createApplication(payload: unknown) {
  return apiRequest("/api/application", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function submitReadiness(payload: unknown) {
  return apiRequest("/api/readiness", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function continueReadiness(payload: unknown) {
  return apiRequest("/api/readiness/continue", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function getReadinessSession(sessionId: string) {
  return apiRequest(`/api/readiness/${encodeURIComponent(sessionId)}`);
}

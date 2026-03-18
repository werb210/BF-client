import { apiRequest } from "./client";
import { hasToken } from "@/lib/auth";

export interface SaveApplicationStepPayload {
  applicationId: string;
  step: number;
  data: Record<string, any>;
}

export interface ContinuationSessionResponse {
  exists: boolean;
  applicationId?: string;
  step?: number;
  data?: Record<string, any>;
}

export async function bootstrapContinuation() {
  if (sessionStorage.getItem("continuation_checked")) return;

  sessionStorage.setItem("continuation_checked", "true");

  return fetchApplicationContinuation();
}

export async function fetchApplicationContinuation() {
  return apiRequest("/api/application/continuation") as Promise<ContinuationSessionResponse>;
}

export async function saveApplicationStep(payload: SaveApplicationStepPayload) {
  await apiRequest("/api/application", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function saveApplicationProgress(data: any) {
  return apiRequest("/api/application", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export async function updateApplication(data: any) {
  if (!hasToken()) return;

  return apiRequest("/api/application/update", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export async function continueApplication(data: any) {
  return apiRequest("/api/application/continuation", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export async function submitApplication(data: any) {
  return apiRequest("/api/readiness", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

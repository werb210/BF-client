import { apiRequest } from "./client";
import { API_ENDPOINTS_CONTRACT } from "@/contracts";
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
  return apiRequest(API_ENDPOINTS_CONTRACT.APPLICATION.CONTINUATION) as Promise<ContinuationSessionResponse>;
}

export async function saveApplicationStep(payload: SaveApplicationStepPayload) {
  await apiRequest(API_ENDPOINTS_CONTRACT.APPLICATION.ROOT, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function saveApplicationProgress(data: any) {
  return apiRequest(API_ENDPOINTS_CONTRACT.APPLICATION.ROOT, {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export async function updateApplication(data: any) {
  if (!hasToken()) return;

  return apiRequest(API_ENDPOINTS_CONTRACT.APPLICATION.UPDATE, {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export async function continueApplication(data: any) {
  return apiRequest(API_ENDPOINTS_CONTRACT.APPLICATION.CONTINUATION, {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export async function submitApplication(data: any) {
  return apiRequest(API_ENDPOINTS_CONTRACT.READINESS.ROOT, {
    method: "POST",
    body: JSON.stringify(data)
  });
}

import { apiCall } from "./client";
import { API_ENDPOINTS_CONTRACT } from "@/contracts";
import { hasToken } from "@/api/auth";

export interface SaveApplicationStepPayload {
  applicationId: string;
  step: number;
  data: Record<string, unknown>;
}

export interface ContinuationSessionResponse {
  exists: boolean;
  applicationId?: string;
  step?: number;
  data?: Record<string, unknown>;
}

export async function bootstrapContinuation() {
  if (sessionStorage.getItem("continuation_checked")) return;

  sessionStorage.setItem("continuation_checked", "true");

  return fetchApplicationContinuation();
}

export async function fetchApplicationContinuation() {
  return apiCall(API_ENDPOINTS_CONTRACT.APPLICATION.CONTINUATION) as Promise<ContinuationSessionResponse>;
}

export async function saveApplicationStep(payload: SaveApplicationStepPayload) {
  // PATCH the application metadata with the step data
  // Only called when applicationId exists (steps 4+)
  await apiCall(`/api/client/applications/${payload.applicationId}`, {
    method: "PATCH",
    body: JSON.stringify({
      metadata: { [`step_${payload.step}`]: payload.data },
      current_step: payload.step,
    }),
  });
}

export async function saveApplicationProgress(data: unknown) {
  return apiCall(API_ENDPOINTS_CONTRACT.APPLICATION.ROOT, {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export async function updateApplication(data: unknown) {
  if (!hasToken()) return;

  return apiCall(API_ENDPOINTS_CONTRACT.APPLICATION.UPDATE, {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export async function continueApplication(data: unknown) {
  return apiCall(API_ENDPOINTS_CONTRACT.APPLICATION.CONTINUATION, {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export async function submitApplication(data: unknown) {
  return apiCall(API_ENDPOINTS_CONTRACT.READINESS.ROOT, {
    method: "POST",
    body: JSON.stringify(data)
  });
}

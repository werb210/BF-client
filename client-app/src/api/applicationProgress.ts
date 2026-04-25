import { apiCall } from "./client";
import { API_ENDPOINTS_CONTRACT } from "@/contracts";
import { hasToken } from "@/api/auth";
import { patchApplication } from "@/client/autosave";

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
  try {
    await patchApplication(payload.applicationId, {
      metadata: { [`step_${payload.step}`]: payload.data },
      current_step: payload.step,
    });
  } catch (err: any) {
    const message = String(err?.message ?? "").toLowerCase();
    const isNotFound =
      message.includes("404") ||
      message.includes("not found") ||
      message.includes("application not found");
    if (isNotFound) {
      clearStaleApplicationToken();
      console.debug("[autosave] stale application cleared");
    }

    // autosave is best-effort; swallow error
  }
}

function clearStaleApplicationToken() {
  if (typeof window === "undefined") return;

  const draftKeys = ["boreal_draft", "application_state", "application_data"];

  draftKeys.forEach((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return;
      localStorage.setItem(
        key,
        JSON.stringify({
          ...parsed,
          applicationToken: null,
          applicationId: null,
        })
      );
    } catch {
      // ignore malformed cached state
    }
  });

  localStorage.removeItem("applicationToken");
  const staleApplicationMessage = "Your previous application expired. Please start again.";
  sessionStorage.setItem("boreal_toast_message", staleApplicationMessage);
  window.dispatchEvent(
    new CustomEvent("boreal:toast", {
      detail: {
        type: "warning",
        message: staleApplicationMessage,
      },
    })
  );
  try {
    window.location.assign("/apply/step-1");
  } catch {
    // noop; jsdom navigation can fail in tests
  }
  window.history.replaceState({}, "", "/apply/step-1");
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

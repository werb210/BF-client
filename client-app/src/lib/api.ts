// BF_CLIENT_BLOCK_v75_FORMS_AUTH_AND_SLIM_HEADER_v1
// Adds ENV.API_BASE prefix + Bearer auth to the four form-response endpoints.
// Pre-fix, these used bare `/api/portal/...` which 405'd because the BF-Client
// SWA has no API proxy in staticwebapp.config.json — requests have to hit
// server.boreal.financial directly.
import { apiCall as clientApiCall } from "@/api/client";
import { ENV } from "@/env";
import { getToken } from "@/auth/token";
import { enqueueFormResponse } from "@/lib/formResponseQueue";

type RequestOptions = Omit<RequestInit, "body" | "headers"> & {
  method?: string;
  body?: unknown;
  headers?: HeadersInit;
  credentials?: RequestCredentials;
};

export async function apiRequest<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const payload = await clientApiCall<unknown>(path, {
    method: options.method || "GET",
    headers: options.headers,
    body: options.body,
    signal: options.signal,
  });

  if (payload && typeof payload === "object") {
    const obj = payload as { status?: string; data?: unknown; error?: string };
    if (obj.status === "error") {
      throw new Error(`API ERROR: ${obj.error || "Unknown API error"}`);
    }
    if (obj.status === "ok" && "data" in obj) {
      return obj.data as T;
    }
  }

  return payload as T;
}

export const api = apiRequest;
export const apiCall = apiRequest;
export const apiPost = <T = unknown>(path: string, body?: unknown) =>
  apiRequest<T>(path, { method: "POST", body });

export const apiUpload = <T = unknown>(path: string, formData: FormData) =>
  apiRequest<T>(path, { method: "POST", body: formData });

// BF_CLIENT_BLOCK_TWO_STAGE_v1 — form-response helpers, rewritten with
// absolute URLs and Bearer auth.
function buildFormResponsesUrl(applicationId: string, suffix = ""): string {
  const base = (ENV.API_BASE || "https://server.boreal.financial").replace(/\/+$/, "");
  return `${base}/api/portal/applications/${encodeURIComponent(applicationId)}/form-responses${suffix}`;
}

function buildAuthHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = getToken();
  const headers: Record<string, string> = { ...(extra ?? {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export type FormResponse = {
  id: string;
  application_id: string;
  doc_type: string;
  data: Record<string, unknown>;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function listFormResponses(applicationId: string): Promise<FormResponse[]> {
  const res = await fetch(buildFormResponsesUrl(applicationId), {
    credentials: "include",
    headers: buildAuthHeaders(),
  });
  if (!res.ok) throw new Error(`listFormResponses ${res.status}`);
  const json = await res.json();
  return Array.isArray(json.items) ? json.items : [];
}

export async function getFormResponse(applicationId: string, docType: string): Promise<FormResponse | null> {
  const res = await fetch(buildFormResponsesUrl(applicationId, `/${encodeURIComponent(docType)}`), {
    credentials: "include",
    headers: buildAuthHeaders(),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`getFormResponse ${res.status}`);
  const json = await res.json();
  return json.item ?? null;
}

export async function saveFormResponse(
  applicationId: string,
  docType: string,
  data: Record<string, unknown>,
): Promise<FormResponse> {
  // BF_CLIENT_BLOCK_v76_FORM_RESPONSE_QUEUE_AND_LP_CACHE_v1
  // If offline, skip the network attempt entirely and enqueue. Avoids the
  // 5-30s "spinner of death" while the browser times out the fetch.
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    await enqueueFormResponse({ applicationId, docType, data });
    return synthesizeFormResponse(applicationId, docType, data);
  }
  try {
    const res = await fetch(buildFormResponsesUrl(applicationId, `/${encodeURIComponent(docType)}`), {
      method: "PUT",
      credentials: "include",
      headers: buildAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ data }),
    });
    if (!res.ok) {
      // 5xx → likely transient; queue for retry. 4xx → permanent; surface it.
      if (res.status >= 500) {
        await enqueueFormResponse({ applicationId, docType, data });
        return synthesizeFormResponse(applicationId, docType, data);
      }
      throw new Error(`saveFormResponse ${res.status}`);
    }
    const json = await res.json();
    return json.item;
  } catch (err) {
    // Network error (TypeError: fetch failed / NetworkError). Queue it.
    // Re-throw if the error wasn't a network failure (e.g. JSON parse error
    // on a malformed 2xx response — which we already accepted, so unlikely).
    const isNetworkError =
      err instanceof TypeError ||
      (err instanceof Error && err.message.startsWith("saveFormResponse 5"));
    if (isNetworkError) {
      await enqueueFormResponse({ applicationId, docType, data });
      return synthesizeFormResponse(applicationId, docType, data);
    }
    throw err;
  }
}

// BF_CLIENT_BLOCK_v76_FORM_RESPONSE_QUEUE_AND_LP_CACHE_v1
// Synthesizes a FormResponse-shaped object so the calling form UI can
// navigate / close / show success without distinguishing online-success
// from queued-for-later. The actual server-side write happens when the
// queue drains; on next page load the GET will return the canonical row.
function synthesizeFormResponse(
  applicationId: string,
  docType: string,
  data: Record<string, unknown>,
): FormResponse {
  const now = new Date().toISOString();
  return {
    id: `pending-${applicationId}-${docType}`,
    application_id: applicationId,
    doc_type: docType,
    data,
    submitted_at: null,
    created_at: now,
    updated_at: now,
  };
}

export async function submitFormResponse(
  applicationId: string,
  docType: string,
  data?: Record<string, unknown>,
): Promise<FormResponse> {
  const res = await fetch(buildFormResponsesUrl(applicationId, `/${encodeURIComponent(docType)}/submit`), {
    method: "POST",
    credentials: "include",
    headers: buildAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(data ? { data } : {}),
  });
  if (!res.ok) throw new Error(`submitFormResponse ${res.status}`);
  const json = await res.json();
  return json.item;
}

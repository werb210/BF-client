// BF_CLIENT_BLOCK_v75_FORMS_AUTH_AND_SLIM_HEADER_v1
// Adds ENV.API_BASE prefix + Bearer auth to the four form-response endpoints.
// Pre-fix, these used bare `/api/portal/...` which 405'd because the BF-Client
// SWA has no API proxy in staticwebapp.config.json — requests have to hit
// server.boreal.financial directly.
import { apiCall as clientApiCall } from "@/api/client";
import { ENV } from "@/env";
import { getToken } from "@/auth/token";

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
  const res = await fetch(buildFormResponsesUrl(applicationId, `/${encodeURIComponent(docType)}`), {
    method: "PUT",
    credentials: "include",
    headers: buildAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ data }),
  });
  if (!res.ok) throw new Error(`saveFormResponse ${res.status}`);
  const json = await res.json();
  return json.item;
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

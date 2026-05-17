import { apiCall as clientApiCall } from "@/api/client";

type RequestOptions = Omit<RequestInit, "body" | "headers"> & {
  method?: string;
  body?: any;
  headers?: HeadersInit;
  credentials?: RequestCredentials;
};

export async function apiRequest<T = any>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const payload = await clientApiCall<any>(path, {
    method: options.method || "GET",
    headers: options.headers,
    body: options.body,
    signal: options.signal,
  });

  if (payload && typeof payload === "object") {
    if ((payload as { status?: string }).status === "error") {
      throw new Error(
        `API ERROR: ${(payload as { error?: string }).error || "Unknown API error"}`,
      );
    }

    if ((payload as { status?: string }).status === "ok" && "data" in (payload as Record<string, unknown>)) {
      return (payload as { data: T }).data;
    }
  }

  return payload as T;
}

export const api = apiRequest;
export const apiCall = apiRequest;
export const apiPost = <T = any>(path: string, body?: unknown) =>
  apiRequest<T>(path, {
    method: "POST",
    body,
  });

export const apiUpload = <T = any>(path: string, formData: FormData) =>
  apiRequest<T>(path, {
    method: "POST",
    body: formData,
  });

// BF_CLIENT_BLOCK_TWO_STAGE_v1 -- form-response helpers.
export type FormResponse = {
  id: string;
  doc_type: string;
  data: Record<string, unknown>;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function listFormResponses(applicationId: string): Promise<FormResponse[]> {
  const res = await fetch(`/api/portal/applications/${applicationId}/form-responses`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`listFormResponses ${res.status}`);
  const json = await res.json();
  return Array.isArray(json.items) ? json.items : [];
}

export async function getFormResponse(applicationId: string, docType: string): Promise<FormResponse | null> {
  const res = await fetch(`/api/portal/applications/${applicationId}/form-responses/${docType}`, {
    credentials: "include",
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
  const res = await fetch(`/api/portal/applications/${applicationId}/form-responses/${docType}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
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
  const res = await fetch(`/api/portal/applications/${applicationId}/form-responses/${docType}/submit`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data ? { data } : {}),
  });
  if (!res.ok) throw new Error(`submitFormResponse ${res.status}`);
  const json = await res.json();
  return json.item;
}


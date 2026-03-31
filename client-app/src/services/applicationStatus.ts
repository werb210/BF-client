// @ts-nocheck
import { apiRequest } from "@/lib/apiClient";
import {
  PortalSubmissionStatusResponseSchema,
  parseApiResponse,
} from "@/contracts/clientApiSchemas";

export type SubmissionStatus = "pending" | "submitted" | "failed" | "unknown";

export type SubmissionStatusSnapshot = {
  status: SubmissionStatus;
  updatedAt: string | null;
  rawStatus: string | null;
};

const SUBMISSION_CACHE_PREFIX = "boreal_submission_status";

function getCacheKey(key: string) {
  return `${SUBMISSION_CACHE_PREFIX}:${key}`;
}

export function normalizeSubmissionStatus(rawStatus: unknown): SubmissionStatus {
  const normalized = String(rawStatus || "").toLowerCase();
  if (normalized === "submitted" || normalized === "complete") return "submitted";
  if (normalized === "pending" || normalized === "processing") return "pending";
  if (normalized === "failed" || normalized === "error") return "failed";
  return "unknown";
}

export function mapSubmissionStatus(payload: unknown): SubmissionStatusSnapshot {
  const rawStatus = payload?.status ?? null;
  const updatedAt = payload?.updated_at ?? payload?.updatedAt ?? null;
  return {
    status: normalizeSubmissionStatus(rawStatus),
    updatedAt: updatedAt ? String(updatedAt) : null,
    rawStatus: rawStatus ? String(rawStatus) : null,
  };
}

export function loadSubmissionStatusCache(
  key: string
): SubmissionStatusSnapshot | null {
  if (!key) return null;
  try {
    const raw = localStorage.getItem(getCacheKey(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SubmissionStatusSnapshot;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSubmissionStatusCache(
  key: string,
  snapshot: SubmissionStatusSnapshot
) {
  if (!key) return;
  try {
    localStorage.setItem(getCacheKey(key), JSON.stringify(snapshot));
  } catch {
  }
}

export async function fetchSubmissionStatus(applicationId: string) {
  const res = await apiRequest(`/api/portal/applications/${applicationId}`);
  const parsed = parseApiResponse(
    PortalSubmissionStatusResponseSchema,
    res,
    "GET /portal/applications/{id}"
  );
  const submission =
    (parsed as unknown)?.submission ?? (parsed as unknown)?.data?.submission ?? (parsed as unknown)?.data ?? {};
  return mapSubmissionStatus(submission);
}

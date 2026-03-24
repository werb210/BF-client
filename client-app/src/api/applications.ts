import api from "@/api/client";
import {
  ApplicationDocumentsResponseSchema,
  ApplicationOffersResponseSchema,
  FetchApplicationResponseSchema,
  PublicApplicationResponseSchema,
  parseApiResponse,
} from "@/contracts/clientApiSchemas";
import { DOCUMENT_CONTRACT } from "@/contracts";
import { enqueueUpload } from "@/lib/uploadQueue";
import { uploadDocument } from "@/services/documentService";
import { getPersistedAttribution } from "@/utils/attribution";
import type { SubmitApplicationRequest } from "./submissionTypes";

export async function submitApplication(
  payload: unknown,
  options?: { idempotencyKey?: string; continuationToken?: string }
): Promise<any> {
  const creditSessionToken = localStorage.getItem("creditSessionToken");
  const attribution = getPersistedAttribution();

  const submissionPayload: SubmitApplicationRequest | unknown =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? {
          ...(payload as SubmitApplicationRequest),
          ...attribution,
          ...(options?.continuationToken ? { continuationToken: options.continuationToken } : {}),
          creditSessionToken,
        }
      : payload;

  const res = await api.post<any>("/applications", submissionPayload);
  localStorage.removeItem("creditSessionToken");
  return (res as { data?: unknown })?.data;
}

export async function createPublicApplication(
  payload: unknown,
  options?: { idempotencyKey?: string; readinessToken?: string; sessionId?: string }
): Promise<any> {
  const attribution = getPersistedAttribution();

  const submissionPayload: SubmitApplicationRequest | unknown =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? {
          ...(payload as SubmitApplicationRequest),
          ...attribution,
          readinessToken: options?.readinessToken,
          sessionId: options?.sessionId,
        }
      : payload;

  const res: unknown = await api.post("/applications", submissionPayload);
  return parseApiResponse(
    PublicApplicationResponseSchema,
    (res as { data: unknown }).data,
    "POST /api/applications"
  );
}

export async function fetchApplication(id: string): Promise<any> {
  const res: unknown = await api.get(`/api/applications/${id}`);
  return parseApiResponse(
    FetchApplicationResponseSchema,
    (res as { data: unknown }).data,
    "GET /api/applications/{id}"
  );
}

export async function fetchApplicationDocuments(id: string): Promise<any> {
  const res: unknown = await api.get(`/api/applications/${id}/documents`);
  return parseApiResponse(
    ApplicationDocumentsResponseSchema,
    (res as { data: unknown }).data,
    "GET /api/applications/{id}/documents"
  );
}

export async function fetchApplicationOffers(id: string): Promise<any> {
  const res: unknown = await api.get(`/api/offers?applicationId=${encodeURIComponent(id)}`);
  return parseApiResponse(
    ApplicationOffersResponseSchema,
    (res as { data: unknown }).data,
    "GET /api/offers?applicationId={id}"
  );
}

export async function uploadApplicationDocument(
  id: string,
  payload: {
    documentCategory: string;
    file: File;
    onProgress?: (progress: number) => void;
  }
): Promise<any> {
  if (payload.file.size > 25 * 1024 * 1024) {
    throw new Error("file_too_large");
  }

  const uploadUrl = DOCUMENT_CONTRACT.UPLOAD;
  const formData = new FormData();
  formData.append(DOCUMENT_CONTRACT.FIELDS.CATEGORY, payload.documentCategory);
  formData.append(DOCUMENT_CONTRACT.FIELDS.APPLICATION_ID, id);
  formData.append(DOCUMENT_CONTRACT.FIELDS.FILE, payload.file);

  if (!navigator.onLine) {
    await enqueueUpload({
      url: uploadUrl,
      formData,
    });
    return { queued: true };
  }

  payload.onProgress?.(10);
  const data = await uploadDocument(payload.file, id, payload.documentCategory);
  payload.onProgress?.(100);
  return data as unknown;
}


export async function acceptApplicationOffer(offerId: string): Promise<any> {
  const res: unknown = await api.post(`/api/offers/${offerId}/accept`);
  return (res as { data?: unknown }).data;
}

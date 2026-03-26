import {
  ApplicationDocumentsResponseSchema,
  ApplicationOffersResponseSchema,
  FetchApplicationResponseSchema,
  PublicApplicationResponseSchema,
  parseApiResponse,
} from "@/contracts/clientApiSchemas";
import { DOCUMENT_CONTRACT } from "@/contracts";
import { apiRequest } from "@/lib/api";
import { enqueueUpload } from "@/lib/uploadQueue";
import { uploadDocument } from "@/services/documentService";
import { getPersistedAttribution } from "@/utils/attribution";
import type { SubmitApplicationRequest } from "./submissionTypes";

export const getApplications = () =>
  apiRequest("/applications");

export const createApplication = (data: any) =>
  apiRequest("/applications", {
    method: "POST",
    body: JSON.stringify(data),
  });

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

  const res = await apiRequest<any>("/applications", {
    method: "POST",
    body: JSON.stringify(submissionPayload),
  });
  localStorage.removeItem("creditSessionToken");
  return res;
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

  const res: unknown = await apiRequest("/applications", {
    method: "POST",
    body: JSON.stringify(submissionPayload),
  });
  return parseApiResponse(
    PublicApplicationResponseSchema,
    res,
    "POST /applications"
  );
}

export async function fetchApplication(id: string): Promise<any> {
  const res: unknown = await apiRequest(`/applications/${id}`);
  return parseApiResponse(
    FetchApplicationResponseSchema,
    res,
    "GET /applications/{id}"
  );
}

export async function fetchApplicationDocuments(id: string): Promise<any> {
  const res: unknown = await apiRequest(`/applications/${id}/documents`);
  return parseApiResponse(
    ApplicationDocumentsResponseSchema,
    res,
    "GET /applications/{id}/documents"
  );
}

export async function fetchApplicationOffers(id: string): Promise<any> {
  const offers = await apiRequest(`/offers?applicationId=${encodeURIComponent(id)}`);

  if (!Array.isArray(offers)) {
    throw new Error("Invalid offers response");
  }

  return parseApiResponse(
    ApplicationOffersResponseSchema,
    offers,
    "GET /offers?applicationId={id}"
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
  return apiRequest(`/offers/${offerId}/accept`, { method: "POST" });
}

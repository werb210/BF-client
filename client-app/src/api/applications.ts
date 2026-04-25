import api, { apiCall } from "./client";
import { apiRequest, apiUpload } from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import { assertApiResponse } from "../lib/assertApiResponse";
import { assertAuthenticated } from "../auth/sessionGuard";
import { validateFile } from "../utils/fileValidation";
import { DEFAULT_API_ERROR_MESSAGE } from "@/utils/apiErrorHandler";
import { patchApplication } from "@/client/autosave";

export const createApplication = async (payload: Record<string, unknown> = {}) => {
  assertAuthenticated();

  try {
    const { data } = await api.post("/api/client/applications", payload);
    if (!data) {
      throw new Error("[API ERROR] EMPTY RESPONSE");
    }
    return assertApiResponse(data);
  } catch (err) {
    console.error("[SUBMIT ERROR]", err);
    throw err;
  }
};

export const submitApplication = async (
  payloadOrId: string | Record<string, unknown>,
  options?: { idempotencyKey?: string; continuationToken?: string }
) => {
  assertAuthenticated();

  // Support both old string call and new payload object call from Step6
  const isPayloadObject = typeof payloadOrId === "object" && payloadOrId !== null;

  try {
    if (isPayloadObject) {
      // Step6 path: POST full application payload to create/finalize
      const payload = payloadOrId as Record<string, unknown>;

      const applicationId =
        (payload.applicationId as string) ||
        (payload.token as string) ||
        null;

      if (!applicationId) {
        throw new Error("Missing applicationId in submission payload");
      }

      const data = await patchApplication(applicationId, {
        metadata: {
          submitted: true,
          submittedAt: new Date().toISOString(),
          ...(options?.idempotencyKey ? { idempotencyKey: options.idempotencyKey } : {}),
          ...(options?.continuationToken ? { continuationToken: options.continuationToken } : {}),
          ...payload,
        },
      });

      return data;
    } else {
      // Simple string applicationId path
      const applicationId = payloadOrId as string;

      if (!applicationId) {
        throw new Error("Missing applicationId");
      }

      const data = await patchApplication(applicationId, {
        metadata: { submitted: true, submittedAt: new Date().toISOString() },
      });

      return data;
    }
  } catch (err) {
    console.error("SUBMISSION_FAILED", err);
    throw new Error(DEFAULT_API_ERROR_MESSAGE);
  }
};

export const createPublicApplication = async (payload: Record<string, unknown>) => {
  try {
    const { data } = await api.post("/api/client/applications", payload);
    if (!data) {
      throw new Error("[API ERROR] EMPTY RESPONSE");
    }
    return assertApiResponse(data);
  } catch (err) {
    console.error("[SUBMIT ERROR]", err);
    throw err;
  }
};

export const fetchApplication = async (applicationId: string) => {
  if (!applicationId) {
    throw new Error("Missing applicationId");
  }

  const { data } = await api.get(`/applications/${applicationId}`);
  if (!data) {
    throw new Error("[API ERROR] EMPTY RESPONSE");
  }
  return assertApiResponse(data);
};

export const fetchApplicationDocuments = async (applicationId: string) => {
  if (!applicationId) {
    throw new Error("Missing applicationId");
  }

  const { data } = await api.get(`/applications/${applicationId}/documents`);
  if (!data) {
    throw new Error("[API ERROR] EMPTY RESPONSE");
  }
  return assertApiResponse(data);
};

export const fetchApplicationOffers = async (applicationId: string) => {
  if (!applicationId) {
    throw new Error("Missing applicationId");
  }

  const { data } = await api.get(`/offers?applicationId=${encodeURIComponent(applicationId)}`);
  if (!data) {
    throw new Error("[API ERROR] EMPTY RESPONSE");
  }
  return assertApiResponse(data);
};

export const uploadApplicationDocument = async (
  applicationId: string,
  payload: { documentCategory: string; file: File; onProgress?: (progress: number) => void }
) => {
  assertAuthenticated();

  if (!applicationId) {
    throw new Error("Missing applicationId");
  }

  validateFile(payload.file);

  const formData = new FormData();
  formData.append("file", payload.file);
  formData.append("applicationId", applicationId);
  formData.append("category", payload.documentCategory);

  payload.onProgress?.(10);
  const data = await apiUpload(ENDPOINTS.uploadDocument, formData);
  payload.onProgress?.(100);

  if (!data) {
    throw new Error("[API ERROR] EMPTY RESPONSE");
  }
  return assertApiResponse(data);
};

export const uploadDocuments = async (
  applicationId: string,
  documents: Array<{ documentCategory: string; file: File; onProgress?: (progress: number) => void }>
) => {
  if (!applicationId) {
    throw new Error("Missing applicationId");
  }

  for (const document of documents) {
    await uploadApplicationDocument(applicationId, document);
  }
};

export const acceptApplicationOffer = async (offerId: string) =>
  apiCall(`/offers/${offerId}/accept`, { method: "POST" });

import api, { apiCall } from "./client";
import { apiRequest, apiUpload } from "@/lib/apiClient";
import { ENDPOINTS } from "@/lib/endpoints";
import { assertApiResponse } from "../lib/assertApiResponse";
import { assertAuthenticated } from "../auth/sessionGuard";
import { validateFile } from "../utils/fileValidation";

export const createApplication = async (payload: Record<string, unknown> = {}) => {
  assertAuthenticated();

  try {
    const { data } = await api.post("/applications", payload);
    if (!data) {
      throw new Error("[API ERROR] EMPTY RESPONSE");
    }
    return assertApiResponse(data);
  } catch (err) {
    console.error("[SUBMIT ERROR]", err);
    throw err;
  }
};

export const submitApplication = async (applicationId: string) => {
  assertAuthenticated();

  if (!applicationId) {
    throw new Error("Missing applicationId");
  }

  try {
    const data = await apiRequest(ENDPOINTS.submitApplication, {
      method: "POST",
      body: JSON.stringify({ applicationId }),
    });

    if (!data) {
      throw new Error("[API ERROR] EMPTY RESPONSE");
    }

    return assertApiResponse(data);
  } catch (err) {
    console.error("SUBMISSION_FAILED", err);
    alert("Submission failed. Please retry.");
    throw err;
  }
};

export const createPublicApplication = async (payload: Record<string, unknown>) => {
  try {
    const { data } = await api.post("/applications", payload);
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
  apiCall(`/api/offers/${offerId}/accept`, { method: "POST" });

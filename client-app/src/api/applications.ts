import api, { apiRequest } from "../lib/api";
import { assertApiResponse } from "../lib/assertApiResponse";
import { requireAuth } from "../utils/requireAuth";
import { validateFile } from "../utils/fileValidation";

export const createApplication = async (payload: any = {}) => {
  requireAuth();

  try {
    const { data } = await api.post("/api/applications", payload);
    return assertApiResponse(data);
  } catch (err) {
    console.error("[SUBMIT ERROR]", err);
    throw err;
  }
};

export const submitApplication = async (applicationId: string) => {
  requireAuth();

  if (!applicationId) {
    throw new Error("Missing applicationId");
  }

  const { data } = await api.post(`/api/applications/${applicationId}/submit`);
  return assertApiResponse(data);
};

export const createPublicApplication = async (payload: any) => {
  try {
    const { data } = await api.post("/api/applications", payload);
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

  const { data } = await api.get(`/api/applications/${applicationId}`);
  return assertApiResponse(data);
};

export const fetchApplicationDocuments = async (applicationId: string) => {
  if (!applicationId) {
    throw new Error("Missing applicationId");
  }

  const { data } = await api.get(`/api/applications/${applicationId}/documents`);
  return assertApiResponse(data);
};

export const fetchApplicationOffers = async (applicationId: string) => {
  if (!applicationId) {
    throw new Error("Missing applicationId");
  }

  const { data } = await api.get(`/api/offers?applicationId=${encodeURIComponent(applicationId)}`);
  return assertApiResponse(data);
};

export const uploadApplicationDocument = async (
  applicationId: string,
  payload: { documentCategory: string; file: File; onProgress?: (progress: number) => void }
) => {
  requireAuth();

  if (!applicationId) {
    throw new Error("Missing applicationId");
  }

  validateFile(payload.file);

  const formData = new FormData();
  formData.append("file", payload.file);
  formData.append("applicationId", applicationId);
  formData.append("category", payload.documentCategory);

  payload.onProgress?.(10);
  const { data } = await api.post("/api/documents/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  payload.onProgress?.(100);

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
  apiRequest(`/api/offers/${offerId}/accept`, { method: "POST" });

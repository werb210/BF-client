import api, { apiRequest } from "../lib/api";
import { assertApiResponse } from "../lib/assertApiResponse";
import { requireAuth } from "../utils/requireAuth";
import { validateFile } from "../utils/fileValidation";

export const createApplication = async (payload: any) => {
  requireAuth();

  const { data } = await api.post("/api/applications", payload);
  return assertApiResponse(data);
};

export const submitApplication = async (id: string) => {
  requireAuth();

  if (!id) {
    throw new Error("applicationId is required before submission");
  }

  const { data } = await api.post(`/api/applications/${id}/submit`);
  return assertApiResponse(data);
};

export const createPublicApplication = async (payload: any) => {
  const { data } = await api.post("/api/applications", payload);
  return assertApiResponse(data);
};

export const fetchApplication = async (id: string) => {
  const { data } = await api.get(`/api/applications/${id}`);
  return assertApiResponse(data);
};

export const fetchApplicationDocuments = async (id: string) => {
  const { data } = await api.get(`/api/applications/${id}/documents`);
  return assertApiResponse(data);
};

export const fetchApplicationOffers = async (id: string) => {
  const { data } = await api.get(`/api/offers?applicationId=${encodeURIComponent(id)}`);
  return assertApiResponse(data);
};

export const uploadApplicationDocument = async (
  id: string,
  payload: { documentCategory: string; file: File; onProgress?: (progress: number) => void }
) => {
  requireAuth();

  validateFile(payload.file);

  const formData = new FormData();
  formData.append("file", payload.file);
  formData.append("applicationId", id);
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
  id: string,
  documents: Array<{ documentCategory: string; file: File; onProgress?: (progress: number) => void }>
) => {
  if (!id) {
    throw new Error("applicationId is required before uploading documents");
  }

  await Promise.all(documents.map((document) => uploadApplicationDocument(id, document)));
};

export const acceptApplicationOffer = async (offerId: string) =>
  apiRequest(`/api/offers/${offerId}/accept`, { method: "POST" });

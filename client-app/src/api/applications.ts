import api, { apiRequest } from "../lib/api";

export const createApplication = async (payload: any) => {
  const { data } = await api.post("/api/applications", payload);
  return data;
};

export const submitApplication = async (payloadOrId: any) => {
  if (typeof payloadOrId === "string") {
    const { data } = await api.post(`/api/applications/${payloadOrId}/submit`);
    return data;
  }

  const { data } = await api.post("/api/applications", payloadOrId);
  return data;
};

export const createPublicApplication = async (payload: any) => {
  const { data } = await api.post("/api/applications", payload);
  return data;
};

export const fetchApplication = async (id: string) => {
  const { data } = await api.get(`/api/applications/${id}`);
  return data;
};

export const fetchApplicationDocuments = async (id: string) => {
  const { data } = await api.get(`/api/applications/${id}/documents`);
  return data;
};

export const fetchApplicationOffers = async (id: string) => {
  const { data } = await api.get(`/api/offers?applicationId=${encodeURIComponent(id)}`);
  return data;
};

export const uploadApplicationDocument = async (
  id: string,
  payload: { documentCategory: string; file: File; onProgress?: (progress: number) => void }
) => {
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

  return data;
};

export const acceptApplicationOffer = async (offerId: string) =>
  apiRequest(`/api/offers/${offerId}/accept`, { method: "POST" });

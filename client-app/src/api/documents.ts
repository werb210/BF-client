import api from "../lib/api";
import { requireAuth } from "../utils/requireAuth";

export const uploadDocument = async (
  file: File,
  applicationId: string,
  category: string
) => {
  requireAuth();

  const formData = new FormData();
  formData.append("file", file);
  formData.append("applicationId", applicationId);
  formData.append("category", category);

  const { data } = await api.post("/api/documents/upload", formData, {
    headers: {},
  });

  return data.data;
};

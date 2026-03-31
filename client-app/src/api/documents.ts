import api from "../lib/api";
import { assertAuthenticated } from "../auth/sessionGuard";

export const uploadDocument = async (
  file: File,
  applicationId: string,
  category: string
) => {
  assertAuthenticated();

  const formData = new FormData();
  formData.append("file", file);
  formData.append("applicationId", applicationId);
  formData.append("category", category);

  const { data } = await api.post("/documents/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  if (!data?.data) {
    throw new Error("[API ERROR] EMPTY RESPONSE");
  }

  return data.data;
};

import api from "../lib/api";

export const uploadDocument = async (file: File, applicationId: string, category: string) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("applicationId", applicationId);
  formData.append("category", category);

  const { data } = await api.post("/api/documents/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return data;
};

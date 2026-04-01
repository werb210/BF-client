import api from "./client";
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

  const { data } = await api.post("/api/documents/upload", formData);

  if (!(data as any)?.data) {
    throw new Error("[API ERROR] EMPTY RESPONSE");
  }

  return (data as any).data;
};

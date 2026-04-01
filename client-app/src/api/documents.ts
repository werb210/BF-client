import { apiUpload } from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
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

  const data = await apiUpload(ENDPOINTS.uploadDocument, formData);
  const response = data as { data?: unknown } | null;
  if (!response?.data) {
    throw new Error("[API ERROR] EMPTY RESPONSE");
  }

  return response.data;
};

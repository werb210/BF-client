import { API_BASE } from "@/lib/apiClient";
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

  const res = await fetch(`${API_BASE}${ENDPOINTS.uploadDocument}`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("API_ERROR", {
      path: ENDPOINTS.uploadDocument,
      status: res.status,
      body: text,
    });
    throw new Error(`API request failed: ${res.status}`);
  }

  const data = await res.json();
  const response = data as { data?: unknown } | null;
  if (!response?.data) {
    throw new Error("[API ERROR] EMPTY RESPONSE");
  }

  return response.data;
};

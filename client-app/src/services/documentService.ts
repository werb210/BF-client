import { apiFetch } from "@/lib/api";

export async function uploadDocument(file: File, applicationId: string, category: string) {
  const formData = new FormData();

  formData.append("file", file);
  formData.append("applicationId", applicationId);
  formData.append("category", category);

  return apiFetch("/api/documents/upload", {
    method: "POST",
    body: formData
  });
}

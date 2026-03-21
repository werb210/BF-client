import { buildUrl } from "@/lib/api";

export async function uploadApplicationDocument(payload: any) {
  const formData = new FormData();

  formData.append(
    "applicationId",
    String(payload.applicationId ?? payload.application_id ?? "")
  );

  formData.append(
    "category",
    String(payload.category ?? payload.document_category ?? "")
  );

  formData.append("file", payload.file);

  return fetch(buildUrl("/documents/upload"), {
    method: "POST",
    body: formData,
    credentials: "include"
  });
}


export const uploadDocument = (file: File, applicationId: string, category = "") =>
  uploadApplicationDocument({ file, applicationId, category });

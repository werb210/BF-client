import { validateFile } from "@/utils/fileValidation";
import { apiRequest } from "@/api/client";
import { buildUrl } from "@/config/api";

type UploadPayload = {
  file: File;
  applicationId?: string;
  application_id?: string;
  category?: string;
  document_category?: string;
};

export async function uploadDocument(file: File, applicationId: string, category = "") {
  const payload: UploadPayload = { file, applicationId, category };
  validateFile(payload.file);

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

  return apiRequest(buildUrl("/documents/upload"), {
    method: "POST",
    body: formData,
    headers: {},
  });
}

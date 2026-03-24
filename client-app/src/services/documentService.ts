import { DOCUMENT_CONTRACT } from "@/contracts";
import { apiFetch } from "@/lib/api";

export async function uploadDocument(file, applicationId, category) {
  if (!file) {
    throw new Error("File is required");
  }

  const formData = new FormData();

  formData.append(
    DOCUMENT_CONTRACT.FIELDS.FILE,
    file
  );

  formData.append(
    DOCUMENT_CONTRACT.FIELDS.APPLICATION_ID,
    applicationId
  );

  formData.append(
    DOCUMENT_CONTRACT.FIELDS.CATEGORY,
    category
  );

  return apiFetch(DOCUMENT_CONTRACT.UPLOAD, {
    method: "POST",
    body: formData
  });
}

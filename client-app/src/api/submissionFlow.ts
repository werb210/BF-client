import { createApplication, submitApplication, uploadDocuments } from "@/api/applications";

type SubmissionDocumentInput = {
  documentCategory: string;
  file: File;
  onProgress?: (progress: number) => void;
};

export async function runSubmissionFlow(
  payload: Record<string, unknown>,
  documents: SubmissionDocumentInput[]
) {
  // 1) create application
  const created = await createApplication(payload) as { applicationId?: string } | null;
  const applicationId = created?.applicationId;

  if (!applicationId) {
    throw new Error("APPLICATION_ID_MISSING");
  }

  // 2) upload documents
  if (documents.length > 0) {
    await uploadDocuments(applicationId, documents);
  }

  // 3) submit application
  return submitApplication(applicationId);
}

import { DOCUMENT_CONTRACT } from '@/contracts';
import { apiCall } from '@/api/client';

export async function uploadDocument(file: any, applicationId: any, category: any) {
  if (!file) {
    throw new Error('File is required');
  }

  const formData = new FormData();

  formData.append(DOCUMENT_CONTRACT.FIELDS.FILE, file);
  formData.append(DOCUMENT_CONTRACT.FIELDS.APPLICATION_ID, applicationId);
  formData.append(DOCUMENT_CONTRACT.FIELDS.CATEGORY, category);

  return apiCall(DOCUMENT_CONTRACT.UPLOAD, {
    method: 'POST',
    body: formData,
  });
}

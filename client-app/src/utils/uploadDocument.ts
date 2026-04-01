import { apiUpload } from "@/lib/apiClient"
import { ENDPOINTS } from "@/lib/endpoints"

export async function uploadDocument(file: File, category: string, applicationId: string) {
  const formData = new FormData()

  formData.append("file", file)
  formData.append("category", category)
  formData.append("applicationId", applicationId)

  return apiUpload(ENDPOINTS.uploadDocument, formData)
}

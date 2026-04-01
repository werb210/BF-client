import { API_BASE } from "@/lib/apiClient"
import { ENDPOINTS } from "@/lib/endpoints"

export async function uploadDocument(file: File, category: string, applicationId: string) {
  const formData = new FormData()

  formData.append("file", file)
  formData.append("category", category)
  formData.append("applicationId", applicationId)

  const response = await fetch(`${API_BASE}${ENDPOINTS.uploadDocument}`, {
    method: "POST",
    body: formData,
  })

  if (!response.ok) {
    const text = await response.text()
    console.error("API_ERROR", {
      path: ENDPOINTS.uploadDocument,
      status: response.status,
      body: text,
    })
    throw new Error(`API request failed: ${response.status}`)
  }

  return response.json()
}

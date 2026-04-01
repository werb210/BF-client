import { apiPost } from "@/lib/apiClient"
import type { ApplicationPayload } from "@/types/application"

export async function submitApplication(payload: ApplicationPayload) {
  if (!payload.businessType || !payload.applicantName || !payload.email) {
    throw new Error("INVALID_APPLICATION_PAYLOAD")
  }

  return apiPost("/api/application/submit", payload)
}

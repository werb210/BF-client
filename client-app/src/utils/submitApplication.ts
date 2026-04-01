import { apiPost } from "@/lib/apiClient"
import type { ApplicationPayload } from "@/types/application"

export async function submitApplication(payload: ApplicationPayload) {
  return apiPost("/api/application/submit", payload)
}

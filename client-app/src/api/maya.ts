import { apiPost } from "@/lib/apiClient"

export async function sendMayaMessage(message: string) {
  return apiPost("/api/maya/message", { message })
}

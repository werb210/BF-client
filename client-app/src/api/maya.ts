import { apiPost } from "@/lib/api"

export async function sendMayaMessage(message: string) {
  return apiPost("/api/maya/message", { message })
}

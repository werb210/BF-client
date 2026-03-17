import { Device } from "@twilio/voice-sdk"
import apiClient from "@/api/client"
import { API_ENDPOINTS } from "@/api/endpoints"
import { getToken } from "@/auth/tokenStorage"

let device: Device | null = null

export async function initializeVoice(identity: string) {
  const token = getToken()
  if (!token) return

  const { data } = await apiClient.post<{ token: string }>(API_ENDPOINTS.TELEPHONY_TOKEN, { identity })

  device = new Device(data.token)

  device.on("registered", () => {
    console.log("Voice device ready")
  })

  ;(device as any).on("error", (error: unknown) => {
    console.error("Voice error", error)
  })
}

export function getVoiceDevice() {
  return device
}

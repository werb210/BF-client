import { Device } from "@twilio/voice-sdk"
import { apiRequest } from "@/lib/api"
import { hasToken } from "@/lib/auth"
import { logClientError } from "@/lib/logger"

let device: Device | null = null

export async function initializeVoice(_identity: string) {
  if (!hasToken()) return

  const res = await apiRequest<{ token?: string }>("/telephony/token")
  if (!res?.token) {
    throw new Error("Invalid telephony token response")
  }

  device = new Device(res.token)

  device.on("registered", () => undefined)

  ;(device as any).on("error", (error: unknown) => {
    logClientError("Voice error", error)
  })
}

export function getVoiceDevice() {
  return device
}

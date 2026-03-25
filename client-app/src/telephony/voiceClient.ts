import { Device } from "@twilio/voice-sdk"
import { apiRequest } from "@/lib/api"
import { hasToken } from "@/lib/auth"
import { logClientError } from "@/lib/logger"

let device: Device | null = null

export async function initializeVoice(_identity: string) {
  if (!hasToken()) return

  const res = await apiRequest("/telephony/token")
  const token = res.token;

  if (!token) {
    throw new Error("Invalid telephony token response")
  }

  device = new Device(token)

  device.on("registered", () => undefined)

  ;(device as any).on("error", (error: unknown) => {
    logClientError("Voice error", error)
  })
}

export function getVoiceDevice() {
  return device
}

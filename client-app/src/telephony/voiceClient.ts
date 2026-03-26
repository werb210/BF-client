import { Device } from "@twilio/voice-sdk"
import { getVoiceToken } from "@/api/telephony"
import { hasToken } from "@/lib/auth"
import { logClientError } from "@/lib/logger"

let device: Device | null = null

export async function initializeVoice(_identity: string) {
  if (!hasToken()) return

  const token = await getVoiceToken();

  device = new Device(token)

  device.on("registered", () => undefined)

  ;(device as any).on("error", (error: unknown) => {
    logClientError("Voice error", error)
  })
}

export function getVoiceDevice() {
  return device
}

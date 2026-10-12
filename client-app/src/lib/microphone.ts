// BF_CLIENT_v789_MIC_PERMISSION
// The in-app Call Us! call (Twilio Voice) opened the microphone only when the
// call connected. Android had no RECORD_AUDIO permission in the manifest, so the
// call connected silent, and a refusal anywhere surfaced as a raw Twilio error.
// Ask first, through the same getUserMedia request the Voice SDK makes: on
// Android the Capacitor WebView turns it into the RECORD_AUDIO runtime prompt,
// on iOS it shows NSMicrophoneUsageDescription, in a browser the site prompt.

export type MicrophoneCheck = {
  ok: boolean;
  reason: "granted" | "denied" | "unavailable";
  /** What to tell the caller when ok is false. */
  message: string | null;
};

export const MIC_DENIED_MESSAGE =
  "Boreal needs your microphone for this call. Allow microphone access for Boreal in your phone or browser settings, then tap Call Us again - or send us a message below.";
export const MIC_UNAVAILABLE_MESSAGE =
  "We couldn't find a microphone on this device. Please send us a message below and an advisor will call you back.";

const DENIED = new Set(["NotAllowedError", "PermissionDeniedError", "SecurityError"]);

export async function ensureMicrophonePermission(): Promise<MicrophoneCheck> {
  const media = typeof navigator !== "undefined" ? navigator.mediaDevices : undefined;
  if (!media || typeof media.getUserMedia !== "function") {
    return { ok: false, reason: "unavailable", message: MIC_UNAVAILABLE_MESSAGE };
  }
  try {
    const stream = await media.getUserMedia({ audio: true });
    // Only the permission was wanted; the Voice SDK opens its own stream.
    stream.getTracks().forEach((track) => track.stop());
    return { ok: true, reason: "granted", message: null };
  } catch (err) {
    const name = String((err as { name?: unknown } | null)?.name ?? "");
    if (DENIED.has(name)) return { ok: false, reason: "denied", message: MIC_DENIED_MESSAGE };
    return { ok: false, reason: "unavailable", message: MIC_UNAVAILABLE_MESSAGE };
  }
}

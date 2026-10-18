// BF_CLIENT_v823_SMS_CODE - Android one-tap sign-in code (Google SMS User Consent; SmsCodePlugin.java). Started just
// before the code is sent; Android asks once to read that one message and the code fills itself in. iPhone already
// suggests the code above the keyboard (autocomplete="one-time-code"), so this is Android only and a no-op elsewhere.
import { Capacitor, registerPlugin } from "@capacitor/core";

interface SmsCodePlugin {
  waitForCode(): Promise<{ code?: string | null }>;
  cancel(): Promise<void>;
}

const SmsCode = registerPlugin<SmsCodePlugin>("SmsCode");

export function smsCodeAvailable(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android" && Capacitor.isPluginAvailable("SmsCode");
}

/** A 6-digit code, or null (not Android, declined, timed out after 5 minutes). */
export async function waitForSmsCode(): Promise<string | null> {
  if (!smsCodeAvailable()) return null;
  try {
    const { code } = await SmsCode.waitForCode();
    return typeof code === "string" && /^\d{6}$/.test(code) ? code : null;
  } catch {
    return null;
  }
}

export async function cancelSmsCode(): Promise<void> {
  if (!smsCodeAvailable()) return;
  await SmsCode.cancel().catch((): void => undefined);
}

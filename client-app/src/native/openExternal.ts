// BF_CLIENT_v805_PHONE_FIXES - web pages (privacy policy, terms, CRA My Business) open inside the app in a
// browser sheet with a Done button, so the client lands back where they were. In a browser tab they open a new tab.
import { Capacitor } from "@capacitor/core";

export async function openExternal(url: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { Browser } = await import("@capacitor/browser");
      await Browser.open({ url, presentationStyle: "popover" });
      return;
    } catch (err) {
      console.error("[openExternal] in-app browser failed, opening normally", err);
    }
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

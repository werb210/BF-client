// BF_CLIENT_INSTALL_CARD_NATIVE_v338
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const prompt = readFileSync(resolve(__dirname, "..", "InstallAppPrompt.tsx"), "utf-8");

describe("the installed app never tells a client to install the app", () => {
  it("asks Capacitor, which is the only thing that knows it is native", () => {
    // navigator.standalone and display-mode:standalone are PWA signals. Neither
    // is true inside a Capacitor WKWebView, so every native launch looked like a
    // fresh Safari tab and the card rendered.
    expect(prompt).toContain('import { Capacitor } from "@capacitor/core";');
    expect(prompt).toContain("if (Capacitor.isNativePlatform()) return true;");
  });

  it("checks the platform at render as well, so the card cannot flash before the effect runs", () => {
    expect(prompt).toContain("if (Capacitor.isNativePlatform() || installed || dismissed) return null;");
  });

  it("keeps the browser checks, because the card must still hide for an installed PWA", () => {
    expect(prompt).toContain("navAny.standalone === true");
    expect(prompt).toContain('window.matchMedia?.("(display-mode: standalone)").matches');
  });

  it("still lets a browser visitor dismiss it permanently", () => {
    expect(prompt).toContain('const DISMISS_KEY = "boreal.install-prompt.dismissed";');
  });
});

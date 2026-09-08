// BF_CLIENT_SPLASH_RECURSION_v1
import { describe, expect, it } from "vitest";
import config from "../../capacitor.config";

describe("splash screen cannot hang the app", () => {
  it("never runs showOnLaunch", () => {
    expect(config.plugins?.SplashScreen?.launchShowDuration).toBe(0);
  });

  it("dismisses without needing JS", () => {
    expect(config.plugins?.SplashScreen?.launchAutoHide).toBe(true);
  });

  it("keeps the existing iOS config", () => {
    expect(config.ios?.contentInset).toBe("always");
  });
});

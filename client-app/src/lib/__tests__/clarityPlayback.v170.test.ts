// BF_CLIENT_CLARITY_PLAYBACK_v170
import { describe, it, expect, afterEach } from "vitest";
import { getClarityPlaybackUrl } from "../clarityPlayback";
function setCookies(s: string) { Object.defineProperty(document, "cookie", { value: s, configurable: true, writable: true }); }
afterEach(() => setCookies(""));
describe("getClarityPlaybackUrl", () => {
  it("builds the player url from _clck/_clsk (caret-delimited)", () => {
    setCookies("_clck=abc123^2^ab^1; _clsk=sess987^1^ab^0");
    expect(getClarityPlaybackUrl()).toBe("https://clarity.microsoft.com/player/x8jrwbuviw/abc123/sess987");
  });
  it("handles the legacy pipe delimiter", () => {
    setCookies("_clck=abc123|2; _clsk=sess987|1");
    expect(getClarityPlaybackUrl()).toBe("https://clarity.microsoft.com/player/x8jrwbuviw/abc123/sess987");
  });
  it("returns null when the Clarity cookies are absent", () => {
    setCookies("foo=bar"); expect(getClarityPlaybackUrl()).toBeNull();
  });
  it("returns null when only one cookie is present", () => {
    setCookies("_clck=abc123^2"); expect(getClarityPlaybackUrl()).toBeNull();
  });
});

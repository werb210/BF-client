// BF_CLIENT_CONSENT_KEY_FIX_v710 + BF_CLIENT_CONSENT_CARRYOVER_v710
import { describe, it, expect, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { hasTrackingConsent, CONSENT_KEY } from "../analytics";
import ConsentBanner from "../../components/ConsentBanner";

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState({}, "", "/");
});

describe("analytics consent gate", () => {
  it("reads the key the mounted banner writes", () => {
    expect(CONSENT_KEY).toBe("boreal_consent_v1");
  });
  it("tracks on implied consent, and stops when the visitor declines", () => {
    expect(hasTrackingConsent()).toBe(true);
    localStorage.setItem("boreal_consent_v1", "granted");
    expect(hasTrackingConsent()).toBe(true);
    localStorage.setItem("boreal_consent_v1", "denied");
    expect(hasTrackingConsent()).toBe(false);
  });
  it("still honours a decline saved by the old banner", () => {
    localStorage.setItem("boreal_cookie_consent", "declined");
    expect(hasTrackingConsent()).toBe(false);
  });
});

describe("consent carried over from boreal.financial", () => {
  it("uses ?consent=granted and does not ask again", () => {
    window.history.replaceState({}, "", "/?consent=granted");
    const { container } = render(<ConsentBanner />);
    expect(localStorage.getItem("boreal_consent_v1")).toBe("granted");
    expect(container.innerHTML).toBe("");
  });
  it("uses ?consent=denied and stops tracking", () => {
    window.history.replaceState({}, "", "/?consent=denied");
    render(<ConsentBanner />);
    expect(hasTrackingConsent()).toBe(false);
  });
  it("a choice made in the app wins over the link", () => {
    localStorage.setItem("boreal_consent_v1", "denied");
    window.history.replaceState({}, "", "/?consent=granted");
    render(<ConsentBanner />);
    expect(localStorage.getItem("boreal_consent_v1")).toBe("denied");
  });
  it("asks when there is no choice anywhere", () => {
    const { container } = render(<ConsentBanner />);
    expect(container.textContent).toContain("Accept");
  });
});

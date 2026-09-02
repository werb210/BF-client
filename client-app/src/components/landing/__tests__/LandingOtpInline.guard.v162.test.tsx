// BF_CLIENT_LANDING_OTP_GUARD_v162
// Behavioural guard, not a source-text assertion. The landing page ("/") must
// carry the phone entry INLINE (PhoneOTPInline) and must not ship an empty
// decorative placeholder in its place. A UI rebuild that relocates the OTP to a
// separate page or drops an unfilled art box will turn this test red instead of
// shipping green (see PR #1126, which did exactly that with the tests rewritten
// to bless it).
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LandingPage from "@/pages/LandingPage";

function renderLanding() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <LandingPage />
    </MemoryRouter>,
  );
}

describe("Landing OTP is inline (v162 guard)", () => {
  it("renders the phone-entry input on the landing itself", () => {
    const { container } = renderLanding();
    const telInput = container.querySelector('input[type="tel"]');
    expect(telInput).not.toBeNull();
  });

  it("mounts the inline apply-otp anchor target", () => {
    const { container } = renderLanding();
    expect(container.querySelector("#apply-otp")).not.toBeNull();
  });

  it("does not ship an empty decorative placeholder in place of the OTP", () => {
    const { container } = renderLanding();
    expect(
      container.querySelector('[data-testid="landing-art-placeholder"]'),
    ).toBeNull();
    expect(container.querySelector(".landing-art")).toBeNull();
  });
});

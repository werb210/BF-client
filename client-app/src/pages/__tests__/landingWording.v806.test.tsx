// BF_CLIENT_v806_TFV - Twilio rejected the toll-free number as "third-party lead generation" (30468), and the
// sign-up page it reviews read like a lead-matching marketplace. Boreal acts for the applicant.
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/components/PhoneOTPInline", () => ({ default: (): null => null }));

import LandingFooter from "@/components/landing/LandingFooter";

describe("v806 sign-up page wording", () => {
  it("the footer describes a financing adviser, not a marketplace", () => {
    const { container } = render(<MemoryRouter><LandingFooter /></MemoryRouter>);
    expect(container.textContent).toContain("Commercial financing advice for businesses in Canada and the United States.");
    expect(container.textContent).not.toMatch(/marketplace/i);
  });
  it("the landing page has no lead-matching wording", async () => {
    const { default: LandingPage } = await import("@/pages/LandingPage");
    const { container } = render(<MemoryRouter><LandingPage /></MemoryRouter>);
    expect(container.textContent).toContain("Business financing, handled by your Boreal advisor.");
    expect(container.textContent).not.toMatch(/marketplace|every lender that fits|lenders who fund companies like yours/i);
  });
});

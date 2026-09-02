// BF_CLIENT_BLOCK_v166_LANDING_HEADER_FOOTER_UNIFY_v1
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import LandingHeader from "@/components/landing/LandingHeader";
import LandingFooter from "@/components/landing/LandingFooter";
import SlimHeader from "@/components/SlimHeader";

describe("BF_CLIENT_BLOCK_v166 — LandingHeader cross-links", () => {
  it("desktop nav links to boreal.insure with the unified label", () => {
    render(<LandingHeader />);
    const link = screen.getByTestId(
      "landing-link-boreal-insurance",
    ) as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("https://www.boreal.insure/");
    expect(link.textContent?.trim()).toBe("Visit Boreal Risk Management");
  });

  it("Apply Now CTA is a hash link to #apply-otp", () => {
    render(<LandingHeader />);
    const link = screen.getByTestId("landing-cta-apply") as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("#apply-otp");
  });

  it("mobile drawer cross-link opens to boreal.insure", () => {
    render(<LandingHeader />);
    fireEvent.click(screen.getByTestId("landing-mobile-toggle"));
    const link = screen.getByTestId(
      "landing-mobile-link-boreal-insurance",
    ) as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("https://www.boreal.insure/");
    expect(link.textContent?.trim()).toBe("Visit Boreal Risk Management");
  });

  it("clicking a mobile nav item closes the drawer", () => {
    render(<LandingHeader />);
    fireEvent.click(screen.getByTestId("landing-mobile-toggle"));
    const link = screen.getByTestId("landing-mobile-link-boreal-insurance");
    fireEvent.click(link);
    // After click, the dialog should no longer be in the DOM.
    expect(
      screen.queryByTestId("landing-mobile-link-boreal-insurance"),
    ).toBeNull();
  });
});

describe("BF_CLIENT_BLOCK_v166 — LandingFooter cross-links", () => {
  it("Explore column links to boreal.insure with the unified label", () => {
    render(<LandingFooter />);
    const link = screen.getByTestId(
      "landing-footer-link-boreal-insurance",
    ) as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("https://www.boreal.insure/");
    expect(link.textContent?.trim()).toBe("Boreal Risk Management");
  });

  it("Apply Now anchor stays as #apply-otp", () => {
    render(<LandingFooter />);
    const apply = screen.getByTestId("landing-footer-apply") as HTMLAnchorElement;
    expect(apply.getAttribute("href")).toBe("#apply-otp");
  });
});

describe("BF_CLIENT_BLOCK_v_HEADER_FOOTER_WWW_v1 — financial links use www (not the bare apex)", () => {
  it("LandingHeader points every boreal.financial link at www", () => {
    const { container } = render(<LandingHeader />);
    const links = Array.from(container.querySelectorAll('a[href*="boreal.financial"]')) as HTMLAnchorElement[];
    expect(links.length).toBeGreaterThan(0);
    for (const a of links) expect(a.getAttribute("href")).toMatch(/^https:\/\/www\.boreal\.financial/);
  });
  it("LandingFooter points every boreal.financial link at www", () => {
    const { container } = render(<LandingFooter />);
    const links = Array.from(container.querySelectorAll('a[href*="boreal.financial"]')) as HTMLAnchorElement[];
    expect(links.length).toBeGreaterThan(0);
    for (const a of links) expect(a.getAttribute("href")).toMatch(/^https:\/\/www\.boreal\.financial/);
  });

  it("SlimHeader points every boreal.financial link at www", () => {
    const { container } = render(<SlimHeader />);
    const links = Array.from(container.querySelectorAll('a[href*="boreal.financial"]')) as HTMLAnchorElement[];
    expect(links.length).toBeGreaterThan(0);
    for (const a of links) expect(a.getAttribute("href")).toMatch(/^https:\/\/www\.boreal\.financial/);
  });
});

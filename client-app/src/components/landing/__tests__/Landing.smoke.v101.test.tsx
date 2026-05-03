import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import LandingHeader from "../LandingHeader";
import LandingFooter from "../LandingFooter";

describe("LandingHeader (v101)", () => {
  it("renders the wordmark and the desktop Apply CTA", () => {
    const { container, getAllByText } = render(<LandingHeader />);
    expect(getAllByText("Boreal Financial").length).toBeGreaterThan(0);
    expect(container.querySelectorAll('a[href="#apply-otp"]').length).toBeGreaterThan(0);
  });

  it("links to the BI cross-site", () => {
    const { container } = render(<LandingHeader />);
    expect(container.querySelector('a[href="https://boreal.insure"]')).not.toBeNull();
  });
});

describe("LandingFooter (v101)", () => {
  it("renders the three-column structure with Apply anchor", () => {
    const { container, getByText, getAllByText } = render(<LandingFooter />);
    expect(getByText("Boreal Financial")).toBeTruthy();
    expect(getByText("Explore")).toBeTruthy();
    expect(getAllByText("Contact").length).toBeGreaterThan(0);
    expect(container.querySelector('a[href="#apply-otp"]')).not.toBeNull();
  });
});

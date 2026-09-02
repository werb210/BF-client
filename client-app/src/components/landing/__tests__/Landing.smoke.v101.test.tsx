import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LandingPage from "@/pages/LandingPage";

describe("mobile landing shell", () => {
  it("renders the branded landing content and real flow links", () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>);

    expect(screen.getByRole("heading", { name: /business financing, made simple/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Get Started" }).getAttribute("href")).toBe("/otp");
    expect(screen.getByRole("link", { name: "Sign in" }).getAttribute("href")).toBe("/otp");
    expect(screen.getAllByAltText("Boreal Financial")[0].getAttribute("src")).toBe("/header.png");
    expect(screen.getByTestId("landing-art-placeholder")).toBeTruthy();
  });

  it("opens and closes the left drawer from both controls", () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>);
    const layer = screen.getByTestId("landing-drawer-layer");

    fireEvent.click(screen.getByTestId("landing-mobile-toggle"));
    expect(layer.classList.contains("is-open")).toBe(true);
    fireEvent.click(screen.getByTestId("landing-drawer-close"));
    expect(layer.classList.contains("is-open")).toBe(false);

    fireEvent.click(screen.getByTestId("landing-mobile-toggle"));
    fireEvent.click(screen.getByTestId("landing-drawer-overlay"));
    expect(layer.classList.contains("is-open")).toBe(false);
  });
});

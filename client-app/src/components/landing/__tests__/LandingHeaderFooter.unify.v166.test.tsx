import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LandingHeader from "@/components/landing/LandingHeader";

describe("LandingHeader mobile navigation", () => {
  it("only exposes destinations backed by existing app routes", () => {
    render(<MemoryRouter><LandingHeader /></MemoryRouter>);
    fireEvent.click(screen.getByTestId("landing-mobile-toggle"));

    expect(screen.getByRole("link", { name: "Home" }).getAttribute("href")).toBe("/");
    expect(screen.getByRole("link", { name: "My Application" }).getAttribute("href")).toBe("/portal");
    expect(screen.queryByRole("link", { name: "Documents" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Messages" })).toBeNull();
  });

  it("closes when a navigation item is selected or Escape is pressed", () => {
    render(<MemoryRouter><LandingHeader /></MemoryRouter>);
    const toggle = screen.getByTestId("landing-mobile-toggle");
    const layer = screen.getByTestId("landing-drawer-layer");

    fireEvent.click(toggle);
    fireEvent.click(screen.getByRole("link", { name: "Home" }));
    expect(layer.classList.contains("is-open")).toBe(false);

    fireEvent.click(toggle);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(layer.classList.contains("is-open")).toBe(false);
  });
});

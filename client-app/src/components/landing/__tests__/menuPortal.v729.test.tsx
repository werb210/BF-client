// BF_CLIENT_MENU_PORTAL_v729
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

vi.mock("@/lib/platform", async (orig) => ({ ...(await orig<Record<string, unknown>>()), isNativeApp: () => false }));
import LandingHeader from "../LandingHeader";

describe("landing mobile menu", () => {
  it("opens on document.body, outside the blurred header", () => {
    const { container } = render(<LandingHeader />);
    fireEvent.click(screen.getByTestId("landing-mobile-toggle"));
    const menu = screen.getByTestId("landing-mobile-menu");
    expect(menu.parentElement).toBe(document.body);
    expect(container.querySelector("header")!.contains(menu)).toBe(false);
  });
  it("closes with Escape and with the close button", () => {
    render(<LandingHeader />);
    fireEvent.click(screen.getByTestId("landing-mobile-toggle"));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByTestId("landing-mobile-menu")).toBeNull();
    fireEvent.click(screen.getByTestId("landing-mobile-toggle"));
    fireEvent.click(screen.getByLabelText("Close menu"));
    expect(screen.queryByTestId("landing-mobile-menu")).toBeNull();
  });
  it("the unmounted headers are gone", () => {
    const c = resolve(__dirname, "../..");
    for (const f of ["MobileHeader.tsx", "PublicHeader.tsx", "Layout.tsx"]) expect(existsSync(resolve(c, f))).toBe(false);
  });
});

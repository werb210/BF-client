// BF_CLIENT_v817 - the PNW home and physical addresses offer Canadian provinces and territories even when the
// prefill (or a stray pick) set the country to the United States.
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ getFormResponse: vi.fn(), saveFormResponse: vi.fn(), submitFormResponse: vi.fn() }));
vi.mock("@/lib/api", () => api);

import PersonalNetWorthForm from "../PersonalNetWorthForm";

beforeEach(() => {
  api.getFormResponse.mockReset().mockResolvedValue(null);
  api.saveFormResponse.mockReset().mockResolvedValue({});
  api.submitFormResponse.mockReset().mockResolvedValue({});
  try { window.localStorage.clear(); } catch { /* ignore */ }
});
afterEach(() => cleanup());

const values = (el: HTMLElement) => Array.from(el.querySelectorAll("option")).map((o) => (o as HTMLOptionElement).value).filter(Boolean);

describe("BF_CLIENT_v817 PNW State / Province", () => {
  it.each(["pnw-primary_home_address", "pnw-primary_physical_address"])("%s lists provinces with a US prefill", async (testId) => {
    render(<PersonalNetWorthForm applicationId="app-1" prefill={{ street: "1 Main", city: "Austin", province: "TX" }} onComplete={vi.fn()} />);
    await waitFor(() => expect((within(screen.getByTestId("pnw-primary_home_address")).getByLabelText("Country") as HTMLSelectElement).value).toBe("US"));
    const block = within(screen.getByTestId(testId));
    const region = block.getByLabelText("State / Province");
    expect(block.getByLabelText("ZIP / Postal code")).toBeTruthy();
    const codes = values(region);
    for (const code of ["AB", "BC", "ON", "QC", "NT", "NU", "YT", "TX"]) expect(codes).toContain(code);
  });

  it("picking a province on a US address switches the country to Canada", async () => {
    render(<PersonalNetWorthForm applicationId="app-1" prefill={{ street: "1 Main", city: "Austin", province: "TX" }} onComplete={vi.fn()} />);
    const home = () => within(screen.getByTestId("pnw-primary_home_address"));
    await waitFor(() => expect((home().getByLabelText("Country") as HTMLSelectElement).value).toBe("US"));
    fireEvent.change(home().getByLabelText("State / Province"), { target: { value: "AB" } });
    expect((home().getByLabelText("Country") as HTMLSelectElement).value).toBe("CA");
  });
});

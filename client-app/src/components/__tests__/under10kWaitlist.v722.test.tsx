// BF_CLIENT_UNDER_10K_WAITLIST_v722
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
const join = vi.fn(async (..._args: any[]) => ({ ok: true }));
vi.mock("../../services/mayaService", () => ({ joinWaitlist: (...a: any[]) => join(...a) }));
import Under10kWaitlist from "../Under10kWaitlist";

describe("Under $10k revenue waitlist", () => {
  it("needs a name, a way to reach them and consent, then joins the under_10k list", async () => {
    render(<Under10kWaitlist />);
    const add = screen.getByText("Add me to the list") as HTMLButtonElement;
    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Pat Lee" } });
    fireEvent.change(screen.getByLabelText("Mobile phone"), { target: { value: "403 555 0101" } });
    expect(add.disabled).toBe(true);
    fireEvent.click(screen.getByRole("checkbox"));
    expect(add.disabled).toBe(false);
    fireEvent.click(add);
    await waitFor(() => expect(join).toHaveBeenCalledWith({ name: "Pat Lee", email: "", phone: "403 555 0101", list: "under_10k", consent: true }));
    expect(await screen.findByTestId("under10k-done")).toBeTruthy();
  });
  it("is shown on the Canadian minimum-revenue screen", () => {
    expect(readFileSync("src/wizard/Step1_KYC.tsx", "utf8")).toContain("<Under10kWaitlist />");
  });
});

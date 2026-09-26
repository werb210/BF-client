// BF_CLIENT_BLOCK_v548_REACTIVATE_HELD
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ReactivateHeldFiles from "../ReactivateHeldFiles";

const apps = [
  { id: "a1", pipeline_state: "Hold", business_name: "Todd's Gym", product_category: "Term Loan", requested_amount: 50000 },
  { id: "a2", pipeline_state: "In Review", business_name: "Other" },
];

describe("v548 reactivate an on-hold file", () => {
  it("shows a button only for files on hold", () => {
    render(<ReactivateHeldFiles apps={apps} onReactivated={() => {}} reactivate={async () => ({})} />);
    expect(screen.getAllByTestId("cmp-reactivate-held")).toHaveLength(1);
    expect(screen.getByText(/Todd's Gym/)).toBeTruthy();
  });
  it("renders nothing when no file is on hold", () => {
    const { container } = render(<ReactivateHeldFiles apps={[apps[1]]} onReactivated={() => {}} />);
    expect(container.innerHTML).toBe("");
  });
  it("clicking reactivates that file and reports back", async () => {
    const reactivate = vi.fn(async () => ({ ok: true }));
    const onReactivated = vi.fn();
    render(<ReactivateHeldFiles apps={apps} onReactivated={onReactivated} reactivate={reactivate} />);
    fireEvent.click(screen.getByText("Reactivate this file"));
    await waitFor(() => expect(onReactivated).toHaveBeenCalledWith("a1"));
    expect(reactivate).toHaveBeenCalledWith("a1");
  });
  it("a failure shows an error and does not report success", async () => {
    const onReactivated = vi.fn();
    render(<ReactivateHeldFiles apps={apps} onReactivated={onReactivated} reactivate={async () => { throw new Error("409"); }} />);
    fireEvent.click(screen.getByText("Reactivate this file"));
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(onReactivated).not.toHaveBeenCalled();
  });
  it("calls the v547 endpoint and is mounted on the portal", () => {
    const cmp = readFileSync("src/components/ReactivateHeldFiles.tsx", "utf-8");
    expect(cmp).toContain("/api/client/applications/${encodeURIComponent(id)}/reactivate");
    const page = readFileSync("src/pages/MiniPortalPage.tsx", "utf-8");
    expect(page).toContain("<ReactivateHeldFiles");
  });
});

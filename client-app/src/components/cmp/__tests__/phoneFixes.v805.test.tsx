// BF_CLIENT_v805_PHONE_FIXES - the phone client portal fixes from the Oct 14 screenshot review, rendered.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const h = vi.hoisted(() => ({
  apiCall: vi.fn(),
  enrolled: false,
  enroll: vi.fn(async () => ({ ok: true })),
  disable: vi.fn(async () => undefined),
}));
vi.mock("@/api/client", () => ({ apiCall: h.apiCall }));
vi.mock("@/state/useApplicationStore", () => ({ useApplicationStore: () => ({ app: { kyc: {} } }) }));
vi.mock("@/components/FieldTips", () => ({ FieldTips: (): null => null }));
vi.mock("@/native/appBadge", () => ({ setAppBadge: vi.fn() }));
vi.mock("@/native/clientWidget", () => ({ updateClientWidget: vi.fn(async () => undefined), actionLine: () => "" }));
vi.mock("@/native/deviceSignIn", () => ({
  HINT_KEY: "hint",
  biometryStatus: async () => ({ native: true, available: true, reason: "" }),
  isEnrolled: async () => h.enrolled,
  enrollDeviceWithReason: async () => { h.enrolled = true; return h.enroll(); },
  disableDeviceSignIn: async () => { h.enrolled = false; return h.disable(); },
}));

import ActionCenter from "@/components/ActionCenter";
import FaceIdSignInToggle from "@/components/FaceIdSignInToggle";
import { StepHeader } from "@/components/StepHeader";
import { AppSwitcherSheet, CmpHello, toSwitcherApp } from "../CmpHome";
import { shortStageLabel } from "../cmpData";

const flush = () => act(async () => { for (let i = 0; i < 6; i += 1) await new Promise((r) => setTimeout(r, 0)); });
const noop = (): void => undefined;
function phoneScreen(on: boolean): void {
  vi.stubGlobal("matchMedia", (q: string) => ({ matches: on, media: q, onchange: null as null, addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop, dispatchEvent: (): boolean => false }));
}
beforeEach(() => { h.apiCall.mockReset(); h.enrolled = false; });
afterEach(() => { vi.unstubAllGlobals(); });

const item = (key: string, kind: "document" | "form", label: string) => ({ key, kind, label, urgent: false });

describe("to-do on a phone", () => {
  it("shows progress, then Documents and Forms with three of each until Show all", async () => {
    h.apiCall.mockResolvedValue({
      outstanding: [item("d1", "document", "Bank statements"), item("d2", "document", "Tax return 2024"), item("d3", "document", "Tax return 2023"), item("d4", "document", "Void cheque"), item("f1", "form", "Personal net worth")],
      completed: [item("c1", "document", "ID"), item("c2", "form", "Advisors")],
      outstandingCount: 5,
    });
    render(<ActionCenter applicationId="app-1" onAction={vi.fn()} grouped />);
    await flush();
    expect(screen.getByTestId("action-center-progress").textContent).toBe("2 of 7 done");
    const docs = screen.getByTestId("action-center-docs");
    expect(docs.textContent).toContain("Documents (4)");
    expect(docs.textContent).not.toContain("Void cheque");
    fireEvent.click(within(docs).getByRole("button", { name: "Show all 4" }));
    expect(docs.textContent).toContain("Void cheque");
    expect(screen.getByTestId("action-center-forms").textContent).toContain("Personal net worth");
  });
});

describe("application switcher", () => {
  it("an unfinished application says so, shows when it was last saved, and offers Continue", () => {
    const app = toSwitcherApp({ id: "a2", business_name: "Draft application", product_category: "EQUIPMENT", requested_amount: 42000, pipeline_state: "draft", submitted_at: null, updated_at: "2026-10-10T15:00:00Z" });
    expect(app).toMatchObject({ business: "Unfinished application", notFinished: true, stage: "Not finished" });
    const onContinue = vi.fn();
    render(<AppSwitcherSheet apps={[app]} currentId="a1" onPick={vi.fn()} onContinue={onContinue} onClose={vi.fn()} />);
    const row = screen.getByTestId("cmp-app-unfinished");
    expect(row.textContent).toContain("Equipment financing · $42,000");
    expect(row.textContent).toMatch(/Not finished · last saved Oct 10/);
    fireEvent.click(within(row).getByRole("button", { name: "Continue" }));
    expect(onContinue).toHaveBeenCalledWith("a2");
  });
  it("uses short stage names", () => {
    expect(shortStageLabel("Funded")).toBe("Funded");
    expect(shortStageLabel("off_to_lender")).not.toContain("_");
  });
});

describe("no advisor yet", () => {
  it("shows the Boreal team with the Boreal logo", () => {
    render(<CmpHello firstName="Todd" advisor={null} onCall={vi.fn()} onMessage={vi.fn()} onBook={vi.fn()} />);
    const card = screen.getByTestId("cmp-advisor");
    expect(card.textContent).toContain("Your team");
    expect(card.textContent).toContain("Boreal Financial team");
    expect(card.querySelector(".cmpx-avatar--brand svg")).not.toBeNull();
  });
});

describe("Face ID sign-in row", () => {
  it("is a settings row with an on/off switch", async () => {
    render(<FaceIdSignInToggle variant="row" />);
    await flush();
    const sw = screen.getByRole("switch", { name: "Face ID sign-in" });
    expect(sw.getAttribute("aria-checked")).toBe("false");
    await act(async () => { fireEvent.click(sw); });
    await flush();
    expect(h.enroll).toHaveBeenCalled();
    expect(screen.getByRole("switch", { name: "Face ID sign-in" }).getAttribute("aria-checked")).toBe("true");
  });
});

describe("Maya in the application on a phone", () => {
  it("opens from a button in the step header", () => {
    phoneScreen(true);
    const opened = vi.fn();
    window.addEventListener("maya:open", opened);
    render(<MemoryRouter><StepHeader step={2} title="Product" /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Ask Maya" }));
    expect((opened.mock.calls[0]?.[0] as CustomEvent).detail).toEqual({ mode: "chat" });
    window.removeEventListener("maya:open", opened);
  });
});

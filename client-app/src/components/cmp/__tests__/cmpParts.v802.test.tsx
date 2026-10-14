// BF_CLIENT_v802_PHONE_UI - the pieces of the phone client portal on their own.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const h = vi.hoisted(() => ({ apiCall: vi.fn() }));
vi.mock("@/api/client", () => ({ apiCall: h.apiCall }));
vi.mock("@/state/useApplicationStore", () => ({ useApplicationStore: () => ({ app: { kyc: {} } }) }));
vi.mock("@/components/FieldTips", () => ({ FieldTips: (): null => null }));

import { defaultRecipient, isFundedState } from "../cmpData";
import BookCallSheet from "../BookCallSheet";
import { CmpStatusCard, toSwitcherApp } from "../CmpHome";
import { CallControl } from "../CmpMore";
import { StepHeader } from "@/components/StepHeader";

const flush = () => act(async () => { for (let i = 0; i < 6; i += 1) await new Promise((r) => setTimeout(r, 0)); });
const noop = (): void => undefined;
function phoneScreen(on: boolean): void {
  vi.stubGlobal("matchMedia", (q: string) => ({ matches: on, media: q, onchange: null as null, addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop, dispatchEvent: (): boolean => false }));
}
beforeEach(() => { h.apiCall.mockReset(); });
afterEach(() => { vi.unstubAllGlobals(); });

describe("who a new chat message goes to", () => {
  const now = Date.parse("2026-10-13T18:00:00Z");
  it("the advisor when a person on staff wrote in the last 24 hours", () => {
    expect(defaultRecipient([{ authorRole: "other", authorName: "Andrew", createdAt: "2026-10-13T09:00:00Z" }], now)).toBe("advisor");
  });
  it("Maya otherwise, and an automatic 'Boreal' message does not count", () => {
    expect(defaultRecipient([{ authorRole: "other", authorName: "Andrew", createdAt: "2026-10-10T09:00:00Z" }], now)).toBe("maya");
    expect(defaultRecipient([{ authorRole: "other", authorName: "Boreal", createdAt: "2026-10-13T17:00:00Z" }], now)).toBe("maya");
    expect(defaultRecipient([], now)).toBe("maya");
  });
  it("Accepted and Funded count as funded", () => {
    expect(isFundedState("Funded")).toBe(true);
    expect(isFundedState("accepted")).toBe(true);
    expect(isFundedState("offer")).toBe(false);
  });
});

describe("status card and switcher rows", () => {
  it("asks what stage the application is at, shows the stage and the bar, and all caught up", () => {
    render(<CmpStatusCard stageLabel="In Review" step={2} total={6} next="Your advisor is reviewing your file." caughtUp />);
    // BF_CLIENT_v807_STATUS - no "Step 2 of 6"; the bar stays.
    expect(screen.getByText("What stage is your application at?")).toBeTruthy();
    expect(screen.queryByText("Step 2 of 6")).toBeNull();
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("2");
    expect(screen.getByTestId("cmp-home-caught-up")).toBeTruthy();
  });
  it("names the business, product and amount; a draft reads Not finished", () => {
    // BF_CLIENT_v805_PHONE_FIXES - a draft is "Not finished" (with a Continue button in the switcher).
    expect(toSwitcherApp({ id: "a", business_name: "Acme", product_category: "LINE_OF_CREDIT", requested_amount: 75000, pipeline_state: "draft" }))
      .toMatchObject({ business: "Acme", product: "Line of credit", amount: "$75,000", stage: "Not finished", notFinished: true });
  });
});

describe("branded call button", () => {
  it("is a drawn icon and words, with no emoji", () => {
    const onStart = vi.fn();
    render(<CallControl state="idle" error={null} onStart={onStart} onEnd={vi.fn()} onReset={vi.fn()} />);
    const b = screen.getByTestId("cmp-call");
    expect(b.textContent).toBe("Call Boreal");
    expect(b.querySelector("svg")).not.toBeNull();
    fireEvent.click(b);
    expect(onStart).toHaveBeenCalled();
  });
});

describe("booking in the app", () => {
  it("uses the team's times when the advisor has none, and books with the details given", async () => {
    h.apiCall.mockImplementation(async (url: string, init?: { method?: string; body?: unknown }) => {
      if (url === "/api/booking/slots?staff=adv-1") return { timeZone: "America/Edmonton", slots: [] };
      if (url === "/api/booking/slots?staff=any") return { timeZone: "America/Edmonton", slots: [{ startsAt: "2099-03-03T16:00:00.000Z", staffIds: ["s2"] }, { startsAt: "2099-03-03T21:30:00.000Z", staffIds: ["s2"] }] };
      if (url === "/api/booking" && init?.method === "POST") return { ok: true, booking: { startsAt: "2099-03-03T16:00:00.000Z", staffFirstName: "Sam", kind: "phone" } };
      return {};
    });
    render(<BookCallSheet advisorId="adv-1" advisorFirstName="Andrew" prefill={{ name: "Todd W", email: "todd@example.com", phone: "5875550123" }} onClose={vi.fn()} />);
    await flush();
    expect(screen.getByText(/A 30-minute call with an advisor/)).toBeTruthy();
    // BF_CLIENT_v805_PHONE_FIXES - times are grouped Morning / Afternoon (Alberta time).
    // Future timezone rules vary with the runtime's tzdata; compare the label in the booking timezone.
    const afternoonTime = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Edmonton", hour: "numeric", minute: "2-digit" })
      .format(new Date("2099-03-03T21:30:00.000Z"));
    expect(within(screen.getByRole("group", { name: "Afternoon times" })).getByRole("button").textContent).toBe(afternoonTime);
    fireEvent.click(within(screen.getByRole("group", { name: "Morning times" })).getByRole("button"));
    await act(async () => { fireEvent.click(screen.getByTestId("cmp-book-confirm")); });
    await flush();
    const post = h.apiCall.mock.calls.find((c) => c[0] === "/api/booking");
    expect(post?.[1]).toMatchObject({ method: "POST", body: { kind: "phone", name: "Todd W", email: "todd@example.com", phone: "5875550123", startsAt: "2099-03-03T16:00:00.000Z", staffId: "any" } });
    expect(screen.getByTestId("cmp-book-done").textContent).toContain("with Sam");
  });
});

describe("wizard header on a phone", () => {
  it("is a thin bar and 'Step 1 of 6 - Profile', with no six-dot stepper", () => {
    phoneScreen(true);
    render(<MemoryRouter><StepHeader step={1} title="Financial Profile" subtitle="Tell us what you need." /></MemoryRouter>);
    expect(screen.getByTestId("step-header-phone").textContent).toContain("Step 1 of 6 \u00b7 Profile");
    expect(screen.queryByText("Owners")).toBeNull();
  });
  it("keeps the full stepper on a computer", () => {
    phoneScreen(false);
    render(<MemoryRouter><StepHeader step={1} title="Financial Profile" /></MemoryRouter>);
    expect(screen.queryByTestId("step-header-phone")).toBeNull();
    expect(screen.getByText("Owners")).toBeTruthy();
  });
});

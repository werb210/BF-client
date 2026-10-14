// BF_CLIENT_v802_PHONE_UI - the phone client portal, driven the way a client uses it.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { actionCenter, apiCallsTo, currentLocation, portalMocks, renderPortal, setApi, settle } from "./miniPortalHarness";

// BF_CLIENT_v805_PHONE_FIXES - an unfinished application continues in the wizard where it was left.
const resumeMocks = vi.hoisted(() => ({ status: vi.fn(async (_id: string) => ({ data: { currentStep: 3 } })) }));
vi.mock("@/api/clientApp", async (orig) => ({ ...(await orig<Record<string, unknown>>()), ClientAppAPI: { status: resumeMocks.status } }));
vi.mock("@/applications/resume", async (orig) => ({ ...(await orig<Record<string, unknown>>()), extractApplicationFromStatus: () => ({ currentStep: 3 }), getResumeRoute: () => "/apply/step-3" }));

const STAFF_REPLY_OLD = { id: "m1", direction: "outbound", body: "Hi, I'm reviewing your file.", staff_name: "Andrew", created_at: "2026-01-02T10:00:00Z" };

const noop = (): void => undefined;
function phoneScreen(on: boolean): void {
  vi.stubGlobal("matchMedia", (q: string) => ({
    matches: on && q.includes("max-width: 640px"), media: q, onchange: null as null,
    addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop, dispatchEvent: (): boolean => false,
  }));
}

beforeEach(() => {
  phoneScreen(true);
  try { localStorage.clear(); } catch { /* jsdom */ }
  setApi({
    "/api/client/applications/by-phone": { applications: [
      { id: "app-1", business_name: "Northern Lights Bakery", product_category: "TERM_LOAN", requested_amount: 150000, pipeline_state: "In Review" },
      { id: "app-2", business_name: "Northern Lights Bakery", product_category: "EQUIPMENT", requested_amount: 42000, pipeline_state: "draft" },
    ] },
    "/api/client/application-stage": { pipeline_state: "in_review", metadata: { applicant: { firstName: "Todd", lastName: "W", email: "todd@example.com" }, business: { name: "Northern Lights Bakery" } } },
    "/api/client/advisor": { advisor: { id: "adv-1", firstName: "Andrew", lastName: "M", photoUrl: null, bookable: true } },
    "/api/client/messages": (_u: string, init?: { method?: string }) => (init?.method === "POST" ? { ok: true } : [STAFF_REPLY_OLD]),
    "/api/maya/message": { reply: "Your file is in review." },
  });
});
afterEach(() => { vi.unstubAllGlobals(); });

describe("v802 phone client portal", () => {
  it("has four tabs, a header with the business and stage, and no application number on Home", async () => {
    await renderPortal();
    expect(["cmp-tab-home", "cmp-tab-chat", "cmp-tab-more", "cmp-tab-settings"].every((id) => screen.queryByTestId(id))).toBe(true);
    expect(screen.queryByTestId("cmp-tab-todo")).toBeNull();
    expect(screen.getByTestId("cmp-header-title").textContent).toContain("Northern Lights Bakery");
    expect(screen.getByTestId("cmp-header-stage").textContent).toBe("In Review");
    expect(screen.getByTestId("cmp-status-stage").textContent).toBe("In Review");
    expect(screen.getByText("Hi Todd")).toBeTruthy();
    expect(screen.getByTestId("cmp-advisor").textContent).toContain("Andrew M");
    expect(document.querySelector(".mp-app-header")).toBeNull();
    expect(screen.queryByTestId("account-bar")).toBeNull();
  });

  it("switches applications from the header", async () => {
    await renderPortal();
    fireEvent.click(screen.getByTestId("cmp-header-title"));
    const sheet = screen.getByTestId("cmp-app-switcher");
    expect(sheet.textContent).toContain("Equipment financing \u00b7 $42,000");
    // BF_CLIENT_v805_PHONE_FIXES - the draft says it is not finished and offers Continue, which resumes the wizard.
    const unfinished = within(sheet).getByTestId("cmp-app-unfinished");
    expect(unfinished.textContent).toContain("Not finished");
    fireEvent.click(within(unfinished).getByRole("button", { name: "Continue" }));
    await waitFor(() => expect(currentLocation()).toBe("/apply/step-3"));
    expect(resumeMocks.status).toHaveBeenCalledWith("app-2");
  });

  it("what happens next counts what is left, and never says forms are left when you are caught up", async () => {
    // BF_CLIENT_v805_PHONE_FIXES
    await renderPortal();
    const onData = (actionCenter() as unknown as { onData: (d: unknown) => void }).onData;
    await act(async () => { onData({ outstanding: [{ key: "d1", kind: "document" }, { key: "d2", kind: "document" }, { key: "form:networth", kind: "form" }], completed: [] }); });
    expect(screen.getByTestId("cmp-status-next").textContent).toContain("3 things left: 2 documents and 1 form.");
    expect(screen.queryByTestId("cmp-home-caught-up")).toBeNull();
    await act(async () => { onData({ outstanding: [], completed: [{ key: "d1", kind: "document" }] }); });
    expect(screen.getByTestId("cmp-home-caught-up")).toBeTruthy();
    expect(screen.getByTestId("cmp-status-next").textContent).toContain("We have what we need from you for now.");
    expect(screen.getByTestId("cmp-status-next").textContent).not.toMatch(/forms? (are|is) left/i);
  });

  it("Start a new application on More opens Step 1", async () => {
    await renderPortal();
    fireEvent.click(screen.getByTestId("cmp-tab-more"));
    fireEvent.click(screen.getByTestId("cmp-more-new"));
    await settle();
    expect(portalMocks.startNewApplication).toHaveBeenCalled();
    expect(currentLocation()).toBe("/apply/step-1");
  });

  it("a question goes to Maya first, and her answer can be sent on to the advisor", async () => {
    await renderPortal();
    fireEvent.click(screen.getByTestId("cmp-tab-chat"));
    const input = screen.getByTestId("cmp-chat-input");
    fireEvent.change(input, { target: { value: "When will I hear back?" } });
    await act(async () => { fireEvent.click(screen.getByTestId("cmp-chat-send")); });
    await settle();
    const maya = apiCallsTo("/api/maya/message");
    expect(maya).toHaveLength(1);
    expect((maya[0][1]?.body as { message: string; application_id: string })).toMatchObject({ message: "When will I hear back?", application_id: "app-1" });
    expect(apiCallsTo("/api/client/messages").filter((c) => c[0] === "/api/client/messages" && c[1]?.method === "POST")).toHaveLength(0);
    expect(screen.getByTestId("cmp-maya-reply").textContent).toContain("Your file is in review.");
    await act(async () => { fireEvent.click(screen.getByTestId("cmp-maya-forward")); });
    await settle();
    const posts = apiCallsTo("/api/client/messages").filter((c) => c[0] === "/api/client/messages" && c[1]?.method === "POST");
    expect(posts).toHaveLength(1);
    expect(posts[0][1]?.body).toMatchObject({ applicationId: "app-1", body: "When will I hear back?", direction: "inbound" });
    expect(screen.getByText("Sent to Andrew")).toBeTruthy();
  });

  it("Message on the advisor card writes to the advisor, not Maya", async () => {
    await renderPortal();
    fireEvent.click(screen.getByTestId("cmp-advisor-message"));
    expect(screen.getByTestId("cmp-to-advisor").getAttribute("aria-selected")).toBe("true");
    fireEvent.change(screen.getByTestId("cmp-chat-input"), { target: { value: "Can we talk tomorrow?" } });
    await act(async () => { fireEvent.click(screen.getByTestId("cmp-chat-send")); });
    await settle();
    expect(apiCallsTo("/api/maya/message")).toHaveLength(0);
    expect(apiCallsTo("/api/client/messages").filter((c) => c[0] === "/api/client/messages" && c[1]?.method === "POST")[0][1]?.body).toMatchObject({ body: "Can we talk tomorrow?" });
  });

  it("a message notification opens the chat", async () => {
    await renderPortal({ path: "/application/app-1?section=messages" });
    expect(document.querySelector(".cmp-tab-chat")).not.toBeNull();
    expect(screen.getByTestId("cmp-to-advisor").getAttribute("aria-selected")).toBe("true");
  });

  it("Book opens the booking sheet in the app with the advisor's own times", async () => {
    setApi({ "/api/booking/slots": { timeZone: "America/Edmonton", slots: [{ startsAt: "2099-03-03T16:00:00.000Z", staffIds: ["adv-1"] }] } });
    await renderPortal();
    fireEvent.click(screen.getByTestId("cmp-advisor-book"));
    await settle();
    expect(screen.getByTestId("cmp-book-sheet")).toBeTruthy();
    expect(apiCallsTo("/api/booking/slots")[0][0]).toBe("/api/booking/slots?staff=adv-1");
  });

  // BF_CLIENT_v807_TABLET - tablets in landscape and computers get the same design: Home and Chat side by side,
  // and a rail for Home, More and Settings (no Chat tab, Chat is always open). The old desktop layout is gone.
  it("landscape tablets and computers show Home and Chat together, with a rail", async () => {
    vi.stubGlobal("matchMedia", (q: string) => ({
      matches: q.includes("min-width: 1024px"), media: q, onchange: null as null,
      addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop, dispatchEvent: (): boolean => false,
    }));
    await renderPortal();
    const root = document.querySelector(".mp-root")!;
    expect(root.className).toContain("cmp-mode-wide");
    expect(screen.getByTestId("cmp-tabbar").className).toContain("cmp-tabbar--rail");
    expect(screen.queryByTestId("cmp-tab-chat")).toBeNull();
    expect(screen.getByTestId("cmp-chat")).toBeTruthy();
    expect(document.querySelector(".mp-app-header")).toBeNull();
    expect(screen.queryByTestId("account-bar")).toBeNull();
    fireEvent.click(screen.getByTestId("cmp-advisor-message"));
    expect(root.className).toContain("cmp-tab-home");
    expect(screen.getByTestId("cmp-to-advisor").getAttribute("aria-selected")).toBe("true");
  });

  it("upright tablets use the tabs, centred", async () => {
    phoneScreen(false);
    await renderPortal();
    expect(document.querySelector(".mp-root")!.className).toContain("cmp-mode-tablet");
    expect(screen.getByTestId("cmp-tab-chat")).toBeTruthy();
  });
});

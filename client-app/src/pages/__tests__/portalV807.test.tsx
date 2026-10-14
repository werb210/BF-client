// BF_CLIENT_v807 - the client portal after the Oct 14 review: stage card wording, who you're writing to in Chat,
// no repeats on More and Settings, editable details, a separate Report a problem sheet, and Android Back.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, screen, within, waitFor } from "@testing-library/react";
import { actionCenter, apiCallsTo, renderPortal, setApi, settle } from "./miniPortalHarness";

const r = vi.hoisted(() => ({ escalate: vi.fn(async (_url: string, _init?: unknown) => ({ ok: true })) }));
vi.mock("@/lib/api", async (orig) => ({ ...(await orig<Record<string, unknown>>()), apiRequest: (url: string, init?: unknown) => (url === "/api/maya/escalate" ? r.escalate(url, init) : Promise.resolve({})) }));
vi.mock("html2canvas", () => ({ default: async () => ({ width: 800, height: 600, toDataURL: () => "data:image/jpeg;base64,SHOT" }) }));

const noop = (): void => undefined;
function phoneScreen(): void {
  vi.stubGlobal("matchMedia", (q: string) => ({
    matches: q.includes("max-width: 640px"), media: q, onchange: null as null,
    addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop, dispatchEvent: (): boolean => false,
  }));
}
function stage(pipeline: string): void {
  setApi({
    "/api/client/application-stage": { pipeline_state: pipeline, metadata: { applicant: { firstName: "Todd", lastName: "W", email: "todd@example.com" }, business: { name: "Northern Lights Bakery" } } },
    "/api/client/advisor": { advisor: { id: "adv-1", firstName: "Andrew", lastName: "M", photoUrl: null, bookable: true } },
    "/api/client/profile": (_u: string, init?: { body?: unknown }) => ({ ok: true, profile: init?.body }),
  });
}
beforeEach(() => { phoneScreen(); r.escalate.mockClear(); stage("in_review"); });
afterEach(() => { vi.unstubAllGlobals(); });

describe("v807 stage card", () => {
  it("Additional Steps with items left says what lenders need, and never 'all caught up'", async () => {
    stage("additional_steps_required");
    await renderPortal();
    await act(async () => { actionCenter().onData?.({ outstanding: [{ key: "d1", kind: "document" }, { key: "form:networth", kind: "form" }], completed: [] } as never); });
    expect(screen.getByTestId("cmp-status-stage").textContent).toBe("Additional Steps");
    expect(screen.getByTestId("cmp-status-next").textContent).toBe("Lenders need a few more items before your file moves on: 1 document and 1 form. They're listed below.");
    expect(screen.queryByTestId("cmp-home-caught-up")).toBeNull();
  });
  it("Additional Steps with nothing left says the advisor is adding what lenders asked for", async () => {
    stage("additional_steps_required");
    await renderPortal();
    await act(async () => { actionCenter().onData?.({ outstanding: [], completed: [{ key: "d1", kind: "document" }] } as never); });
    expect(screen.getByTestId("cmp-status-next").textContent).toContain("Everything asked for so far is in.");
    expect(screen.queryByTestId("cmp-home-caught-up")).toBeNull();
  });
});

describe("v807 chat says who you're writing to", () => {
  it("two clear choices, and a line above the message box", async () => {
    await renderPortal();
    fireEvent.click(screen.getByTestId("cmp-tab-chat"));
    fireEvent.click(screen.getByTestId("cmp-to-maya"));
    expect(screen.getByTestId("cmp-chat-writing").textContent).toContain("Maya, our AI assistant");
    fireEvent.click(screen.getByTestId("cmp-to-advisor"));
    expect(screen.getByTestId("cmp-to-advisor").getAttribute("aria-selected")).toBe("true");
    expect(screen.getByTestId("cmp-chat-writing").textContent).toContain("Andrew, your advisor");
    expect(screen.getByTestId("cmp-to-maya").textContent).toContain("AI assistant");
  });
});

describe("v807 no repeats", () => {
  it("More has no Call, Book or Ask Maya; Settings has no Documents or Ask a question", async () => {
    await renderPortal();
    const more = screen.getByTestId("cmp-more");
    expect(more.textContent).not.toMatch(/Call Boreal|Book a call|Ask Maya|Talk to us/);
    const settings = screen.getByTestId("cmp-settings");
    expect(within(settings).queryByTestId("cmp-settings-documents")).toBeNull();
    expect(within(settings).queryByTestId("cmp-settings-ask")).toBeNull();
    expect(within(settings).getByTestId("cmp-settings-report")).toBeTruthy();
  });
});

describe("v807 your details", () => {
  it("edits name, email and business, saves them to the CRM, and keeps the mobile read-only", async () => {
    await renderPortal();
    fireEvent.click(screen.getByTestId("cmp-tab-settings"));
    expect(screen.getByTestId("cmp-settings").textContent).toContain("Your mobile number is how you sign in.");
    fireEvent.click(screen.getByTestId("cmp-details-edit"));
    expect(screen.queryByTestId("cmp-details-phone")).toBeNull();
    fireEvent.change(screen.getByTestId("cmp-details-email"), { target: { value: "todd@newmail.com" } });
    fireEvent.change(screen.getByTestId("cmp-details-business"), { target: { value: "Northern Lights Bakery Ltd" } });
    await act(async () => { fireEvent.click(screen.getByTestId("cmp-details-save")); });
    await settle();
    expect(apiCallsTo("/api/client/profile")[0]?.[1]).toMatchObject({ method: "POST", body: { applicationId: "app-1", firstName: "Todd", lastName: "W", email: "todd@newmail.com", businessName: "Northern Lights Bakery Ltd" } });
    expect(screen.getByTestId("cmp-settings-details").textContent).toContain("todd@newmail.com");
    expect(screen.getByTestId("cmp-header-title").textContent).toContain("Northern Lights Bakery Ltd");
  });
  it("checks the email before saving", async () => {
    await renderPortal();
    fireEvent.click(screen.getByTestId("cmp-details-edit"));
    fireEvent.change(screen.getByTestId("cmp-details-email"), { target: { value: "nope" } });
    await act(async () => { fireEvent.click(screen.getByTestId("cmp-details-save")); });
    expect(screen.getByRole("alert").textContent).toBe("Check your email address.");
    expect(apiCallsTo("/api/client/profile")).toHaveLength(0);
  });
});

describe("v807 report a problem", () => {
  it("is its own sheet with a picture of the screen, sent the same way as Maya's report, with no Maya", async () => {
    await renderPortal();
    fireEvent.click(screen.getByTestId("cmp-tab-settings"));
    fireEvent.click(screen.getByTestId("cmp-settings-report"));
    const sheet = screen.getByTestId("cmp-report-sheet");
    expect(sheet.textContent).not.toMatch(/Maya/);
    await waitFor(() => expect(screen.getByTestId("cmp-report-include-shot")).toBeTruthy());
    fireEvent.change(screen.getByTestId("cmp-report-text"), { target: { value: "Upload did nothing" } });
    await act(async () => { fireEvent.click(screen.getByTestId("cmp-report-send")); });
    expect(r.escalate).toHaveBeenCalledWith("/api/maya/escalate", expect.objectContaining({ method: "POST", body: expect.objectContaining({ kind: "report_issue", description: "Upload did nothing", screenshot_data_url: "data:image/jpeg;base64,SHOT", application_id: "app-1" }) }));
    expect(screen.getByTestId("cmp-report-sent")).toBeTruthy();
  });
});

describe("v807 Android Back", () => {
  it("returns to Home from another tab, and lets the app go to the background from Home", async () => {
    await renderPortal();
    fireEvent.click(screen.getByTestId("cmp-tab-more"));
    let notHandled = true;
    act(() => { notHandled = window.dispatchEvent(new CustomEvent("boreal:back", { cancelable: true })); });
    expect(notHandled).toBe(false);
    expect(document.querySelector(".mp-root")!.className).toContain("cmp-tab-home");
    act(() => { notHandled = window.dispatchEvent(new CustomEvent("boreal:back", { cancelable: true })); });
    expect(notHandled).toBe(true);
  });
});

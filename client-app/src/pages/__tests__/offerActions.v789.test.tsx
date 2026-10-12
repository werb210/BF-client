// BF_CLIENT_v789_OFFER_ACTIONS
// Accept and Request Changes had no error handling: a failed call was an
// unhandled rejection, the button stayed live for a second (duplicate) tap, and
// the client was told nothing either way.
import { describe, it, expect, vi, afterEach } from "vitest";
import { act, fireEvent, screen, within } from "@testing-library/react";
import { apiCallsTo, apiError, renderPortal, setApi, settle } from "./miniPortalHarness";

const OFFER = { id: "off-1", lender_name: "Northern Bank", amount: "50,000", rate_factor: "1.25", term: "2", payment_frequency: "Weekly", expiry_date: "2099-01-01T00:00:00Z" };

function deferred<T = unknown>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

async function openOffers() {
  setApi({ "/api/client/offers": { items: [OFFER] } });
  await renderPortal();
  fireEvent.click(screen.getByTestId("open-offers-btn"));
  return screen.getByRole("dialog", { name: "Offers" });
}

afterEach(() => { vi.restoreAllMocks(); });

describe("v789 Accept", () => {
  it("disables both buttons while the request is in flight, and a second click sends nothing", async () => {
    const pending = deferred();
    setApi({ "/api/offers/off-1/accept": () => pending.promise });
    const dialog = await openOffers();
    const accept = within(dialog).getByTestId("accept-offer-btn") as HTMLButtonElement;
    fireEvent.click(accept);
    expect(accept.disabled).toBe(true);
    expect(accept.textContent).toBe("Accepting...");
    expect(accept.getAttribute("aria-busy")).toBe("true");
    expect((within(dialog).getByTestId("request-changes-btn") as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(accept);
    fireEvent.click(accept);
    expect(apiCallsTo("/api/offers/off-1/accept")).toHaveLength(1);
    await act(async () => { pending.resolve({ ok: true }); });
    await settle();
  });

  it("on failure says so in words and leaves the offer actionable", async () => {
    setApi({ "/api/offers/off-1/accept": apiError(500, "boom") });
    const dialog = await openOffers();
    fireEvent.click(within(dialog).getByTestId("accept-offer-btn"));
    await settle();
    const notice = within(dialog).getByTestId("offer-notice");
    expect(notice.getAttribute("role")).toBe("alert");
    expect(notice.textContent).toBe("We couldn't accept this offer just now. Please check your connection and try again, or message us.");
    const accept = within(dialog).getByTestId("accept-offer-btn") as HTMLButtonElement;
    expect(accept.disabled).toBe(false);
    expect(accept.textContent).toBe("Accept");
    expect((within(dialog).getByTestId("request-changes-btn") as HTMLButtonElement).disabled).toBe(false);
    expect(within(dialog).queryByText(/Sent for staff confirmation/)).toBeNull();
    // It can be tried again, and a retry clears the old error first.
    setApi({ "/api/offers/off-1/accept": { ok: true } });
    fireEvent.click(accept);
    await settle();
    expect(apiCallsTo("/api/offers/off-1/accept")).toHaveLength(2);
    expect(within(dialog).getByTestId("offer-notice").getAttribute("role")).toBe("status");
  });

  it("names a signed-out session and a changed offer specifically", async () => {
    setApi({ "/api/offers/off-1/accept": apiError(401) });
    const dialog = await openOffers();
    fireEvent.click(within(dialog).getByTestId("accept-offer-btn"));
    await settle();
    expect(within(dialog).getByTestId("offer-notice").textContent).toMatch(/session has ended/i);
    setApi({ "/api/offers/off-1/accept": apiError(409) });
    fireEvent.click(within(dialog).getByTestId("accept-offer-btn"));
    await settle();
    expect(within(dialog).getByTestId("offer-notice").textContent).toMatch(/changed since it was sent/i);
  });

  it("on success confirms it and shows the pending state instead of the buttons", async () => {
    setApi({ "/api/offers/off-1/accept": { ok: true } });
    const dialog = await openOffers();
    fireEvent.click(within(dialog).getByTestId("accept-offer-btn"));
    await settle();
    const notice = within(dialog).getByTestId("offer-notice");
    expect(notice.getAttribute("role")).toBe("status");
    expect(notice.textContent).toBe("Offer accepted. We've sent it for staff confirmation.");
    expect(within(dialog).getByText("Sent for staff confirmation. We'll text you when it's ready to sign.")).toBeTruthy();
    expect(within(dialog).queryByTestId("accept-offer-btn")).toBeNull();
    expect(within(dialog).queryByTestId("request-changes-btn")).toBeNull();
    const [[, init]] = apiCallsTo("/api/offers/off-1/accept");
    expect(init?.method).toBe("POST");
  });
});

describe("v789 Request Changes", () => {
  it("disables both buttons while sending, and a second click sends nothing", async () => {
    vi.spyOn(window, "prompt").mockReturnValue("Lower rate please");
    const pending = deferred();
    setApi({ "/api/offers/off-1/request-changes": () => pending.promise });
    const dialog = await openOffers();
    const changes = within(dialog).getByTestId("request-changes-btn") as HTMLButtonElement;
    fireEvent.click(changes);
    expect(changes.disabled).toBe(true);
    expect(changes.textContent).toBe("Sending...");
    expect((within(dialog).getByTestId("accept-offer-btn") as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(changes);
    fireEvent.click(within(dialog).getByTestId("accept-offer-btn"));
    expect(apiCallsTo("/api/offers/off-1/request-changes")).toHaveLength(1);
    expect(apiCallsTo("/api/offers/off-1/accept")).toHaveLength(0);
    await act(async () => { pending.resolve({ ok: true }); });
    await settle();
  });

  it("on failure shows a readable error and the offer can still be acted on", async () => {
    vi.spyOn(window, "prompt").mockReturnValue("Longer term");
    setApi({ "/api/offers/off-1/request-changes": apiError(503) });
    const dialog = await openOffers();
    fireEvent.click(within(dialog).getByTestId("request-changes-btn"));
    await settle();
    const notice = within(dialog).getByTestId("offer-notice");
    expect(notice.getAttribute("role")).toBe("alert");
    expect(notice.textContent).toBe("We couldn't send your change request just now. Please check your connection and try again, or message us.");
    expect((within(dialog).getByTestId("request-changes-btn") as HTMLButtonElement).disabled).toBe(false);
    expect((within(dialog).getByTestId("accept-offer-btn") as HTMLButtonElement).disabled).toBe(false);
  });

  it("on success confirms the request and sends the client's reason", async () => {
    vi.spyOn(window, "prompt").mockReturnValue("  Lower rate please  ");
    setApi({ "/api/offers/off-1/request-changes": { ok: true } });
    const dialog = await openOffers();
    fireEvent.click(within(dialog).getByTestId("request-changes-btn"));
    await settle();
    expect(within(dialog).getByTestId("offer-notice").textContent).toBe("Change request sent. Your advisor will reply here.");
    const [[, init]] = apiCallsTo("/api/offers/off-1/request-changes");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({ reason: "Lower rate please" });
  });

  it("sends nothing when the client cancels the prompt", async () => {
    vi.spyOn(window, "prompt").mockReturnValue(null);
    const dialog = await openOffers();
    fireEvent.click(within(dialog).getByTestId("request-changes-btn"));
    await settle();
    expect(apiCallsTo("/api/offers/off-1/request-changes")).toHaveLength(0);
    expect(within(dialog).queryByTestId("offer-notice")).toBeNull();
    expect((within(dialog).getByTestId("request-changes-btn") as HTMLButtonElement).disabled).toBe(false);
  });
});

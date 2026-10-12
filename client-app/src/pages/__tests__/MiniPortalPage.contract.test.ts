// BF_MINI_PORTAL_FIX_v48
// The offers list arrives from the server as snake_case rows, in {items}, {data}
// or a bare array. The page must read every shape, show the normalised fields,
// and wire View PDF / Accept / Request Changes to the server's offer routes.
// The busy / error / success handling of the two actions lives in offerActions.v789.test.tsx.
import { describe, it, expect, vi, afterEach } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import { apiCallsTo, jsonResponse, portalMocks, renderPortal, setApi, setFetch, settle } from "./miniPortalHarness";

const SERVER_OFFER = {
  id: "off-7",
  lender_name: "Northern Bank",
  lender_logo_url: null as string | null,
  amount: 75000,
  rate_factor: "1.32",
  term: "3",
  payment_frequency: "Bi-weekly",
  expiry_date: "2099-06-01T00:00:00Z",
  document_url: "https://blob.test/term-sheet.pdf",
  recommended: true,
};

async function openOffers() {
  await renderPortal();
  fireEvent.click(screen.getByTestId("open-offers-btn"));
  return screen.getByRole("dialog", { name: "Offers" });
}

afterEach(() => { vi.restoreAllMocks(); });

describe("BF_MINI_PORTAL_FIX_v48 MiniPortalPage offers", () => {
  it.each([
    ["{items}", { items: [SERVER_OFFER] }],
    ["{data}", { data: [SERVER_OFFER] }],
    ["a bare array", [SERVER_OFFER]],
  ])("reads the offers when the server answers with %s", async (_label, body) => {
    setApi({ "/api/client/offers": body });
    const dialog = await openOffers();
    expect(within(dialog).getByText("Northern Bank")).toBeTruthy();
  });

  it("shows the snake_case fields normalised on the offer card", async () => {
    setApi({ "/api/client/offers": { items: [SERVER_OFFER] } });
    const dialog = await openOffers();
    expect(within(dialog).getByText("$75000")).toBeTruthy();
    expect(within(dialog).getByText("1.32 factor")).toBeTruthy();
    expect(within(dialog).getByText("3 years | Term")).toBeTruthy();
    expect(within(dialog).getByText("Bi-weekly payment")).toBeTruthy();
    expect(within(dialog).getByText("Recommended")).toBeTruthy();
    expect(within(dialog).getByText(/^Expires in \d+ days, \d+ hours$/)).toBeTruthy();
  });

  it("falls back to placeholders when a row has no lender name or amount", async () => {
    setApi({ "/api/client/offers": { items: [{ id: "bare" }] } });
    const dialog = await openOffers();
    expect(within(dialog).getByText("Unknown lender")).toBeTruthy();
    expect(within(dialog).getByText("— factor")).toBeTruthy();
  });

  it("View PDF streams the term sheet with the sign-in token", async () => {
    setApi({ "/api/client/offers": { items: [SERVER_OFFER] } });
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    const urlApi = URL as unknown as Record<string, unknown>;
    const saved = { create: urlApi.createObjectURL, revoke: urlApi.revokeObjectURL };
    urlApi.createObjectURL = vi.fn(() => "blob:term-sheet");
    urlApi.revokeObjectURL = vi.fn();
    setFetch(() => new Response(new Blob(["%PDF"]), { status: 200 }));
    const dialog = await openOffers();
    fireEvent.click(within(dialog).getByTestId("view-pdf-link"));
    await settle();
    const [url, init] = portalMocks.fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.test/api/offers/off-7/term-sheet");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok-123");
    expect(open).toHaveBeenCalledWith("blob:term-sheet", "_blank", "noreferrer");
    urlApi.createObjectURL = saved.create;
    urlApi.revokeObjectURL = saved.revoke;
  });

  it("View PDF falls back to the offer's document_url when the stream fails", async () => {
    setApi({ "/api/client/offers": { items: [SERVER_OFFER] } });
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    setFetch(() => jsonResponse({ error: "gone" }, 404));
    const dialog = await openOffers();
    fireEvent.click(within(dialog).getByTestId("view-pdf-link"));
    await settle();
    expect(open).toHaveBeenCalledWith("https://blob.test/term-sheet.pdf", "_blank", "noreferrer");
  });

  it("Accept posts to the offer's accept route, URL-encoding the id", async () => {
    setApi({ "/api/client/offers": { items: [{ ...SERVER_OFFER, id: "off/7" }] } });
    const dialog = await openOffers();
    fireEvent.click(within(dialog).getByTestId("accept-offer-btn"));
    await settle();
    const calls = apiCallsTo("/api/offers/");
    expect(calls.map((c) => c[0])).toEqual(["/api/offers/off%2F7/accept"]);
    expect(calls[0][1]?.method).toBe("POST");
  });

  it("Request Changes posts to the offer's request-changes route", async () => {
    vi.spyOn(window, "prompt").mockReturnValue("Shorter term");
    setApi({ "/api/client/offers": { items: [SERVER_OFFER] } });
    const dialog = await openOffers();
    fireEvent.click(within(dialog).getByTestId("request-changes-btn"));
    await settle();
    const calls = apiCallsTo("/api/offers/");
    expect(calls.map((c) => c[0])).toEqual(["/api/offers/off-7/request-changes"]);
    expect(calls[0][1]?.method).toBe("POST");
  });
});

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { OffersView, type OfferTermSheet } from "../offers/OffersView";

const baseOffer: OfferTermSheet = {
  id: "offer-1",
  lender_name: "North Bank",
  product_name: "Working Capital",
  terms: {
    amount: 250000,
    term_months: 18,
    rate: 7.2,
  },
  expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
  status: "active",
  document_url: "https://example.com/term-sheet.pdf",
};

describe("OffersView", () => {
  it("renders empty state when no offers exist", () => {
    const html = renderToStaticMarkup(<OffersView offers={[]} />);
    expect(html).toContain("No offers available yet");
  });

  it("renders active offers with details", () => {
    const html = renderToStaticMarkup(<OffersView offers={[baseOffer]} />);
    expect(html).toContain("Active offers");
    expect(html).toContain(baseOffer.lender_name);
    expect(html).toContain(baseOffer.product_name);
    expect(html).toContain("View Term Sheet");
  });

  it("separates archived offers", () => {
    const archivedOffer = { ...baseOffer, id: "offer-2", status: "expired" };
    const html = renderToStaticMarkup(
      <OffersView offers={[baseOffer, archivedOffer]} />
    );
    expect(html).toContain("Archived offers");
    expect(html).toContain("Expired");
  });

  // BF_CLIENT_TEST_REPAIR_v1 - BF_CLIENT_TERM_SHEET_STREAM_v1 replaced the
  // plain <a href target="_blank"> with a button that fetches the term sheet
  // through the authenticated /api/offers/:id/term-sheet endpoint and opens the
  // resulting blob. Asserting on href/target pinned the old design, not the
  // behaviour. The legacy document_url is still used as a fallback inside the
  // click handler.
  it("renders a term sheet control for an offer that has one", () => {
    const html = renderToStaticMarkup(<OffersView offers={[baseOffer]} />);
    expect(html).toContain("View Term Sheet");
    expect(html).toContain("<button");
  });

  it("renders no term sheet control when the offer has neither id nor url", () => {
    const bare: OfferTermSheet = { ...baseOffer, id: "", document_url: null };
    const html = renderToStaticMarkup(<OffersView offers={[bare]} />);
    expect(html).not.toContain("View Term Sheet");
  });

  it("renders offer action buttons", () => {
    const html = renderToStaticMarkup(<OffersView offers={[baseOffer]} />);
    expect(html).toMatch(/Accept Offer/i);
    expect(html).toMatch(/Request Changes/i);
  });
});

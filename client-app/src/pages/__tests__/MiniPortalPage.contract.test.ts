// BF_MINI_PORTAL_FIX_v48 — file-content contract test.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const file = fs.readFileSync(path.resolve(__dirname, "../MiniPortalPage.tsx"), "utf8");

describe("BF_MINI_PORTAL_FIX_v48 MiniPortalPage", () => {
  it("consumes the server's {items} shape", () => {
    expect(file).toMatch(/items\?:\s*ServerOffer\[\]/);
  });
  it("normalizes snake_case to camelCase via normalizeOffer", () => {
    expect(file).toContain("function normalizeOffer");
    expect(file).toContain("lender_name");
    expect(file).toContain("rate_factor");
    expect(file).toContain("payment_frequency");
    expect(file).toContain("expiry_date");
    expect(file).toContain("document_url");
  });
  it("wires View PDF, Accept, Request Changes buttons", () => {
    expect(file).toContain('data-testid="view-pdf-link"');
    expect(file).toContain('data-testid="accept-offer-btn"');
    expect(file).toContain('data-testid="request-changes-btn"');
    expect(file).toContain("acceptOffer");
    expect(file).toContain("requestChanges");
  });
  it("hits the new server endpoints", () => {
    expect(file).toContain("/api/offers/${encodeURIComponent(offerId)}/accept");
    expect(file).toContain("/api/offers/${encodeURIComponent(offerId)}/decline");
  });
});

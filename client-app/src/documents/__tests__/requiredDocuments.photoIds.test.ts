// BF_CLIENT_BLOCK_v156_DOC_SOURCE_OF_TRUTH_v1
// ensureAlwaysRequiredDocuments is now a no-op pass-through. The server's
// /api/portal/lender-products/required-docs is the source of truth for
// required documents (including the always-required + photo-ID entries
// that the portal's create-product form has the operator pick per product).
import { describe, expect, it } from "vitest";
import { ensureAlwaysRequiredDocuments } from "../requiredDocuments";
import type { LenderProductRequirement } from "../../wizard/requirements";

describe("ensureAlwaysRequiredDocuments — no-op pass-through (v156)", () => {
  it("returns the input requirements unchanged when empty", () => {
    expect(ensureAlwaysRequiredDocuments([])).toEqual([]);
  });

  it("returns the input requirements unchanged regardless of hasPartner", () => {
    const docs: LenderProductRequirement[] = [
      { id: "x", document_type: "tax_returns", required: true, min_amount: null, max_amount: null },
    ];
    expect(ensureAlwaysRequiredDocuments(docs, { hasPartner: true })).toEqual(docs);
    expect(ensureAlwaysRequiredDocuments(docs, { hasPartner: false })).toEqual(docs);
  });

  it("returns the input requirements unchanged for any category", () => {
    const docs: LenderProductRequirement[] = [
      { id: "x", document_type: "Budget", required: true, min_amount: null, max_amount: null },
    ];
    expect(ensureAlwaysRequiredDocuments(docs, { category: "MEDIA" })).toEqual(docs);
    expect(ensureAlwaysRequiredDocuments(docs, { category: "TERM_LOAN" })).toEqual(docs);
  });
});

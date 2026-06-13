import { describe, expect, it } from "vitest";
import { aggregateRequiredDocuments } from "../requiredDocuments";

describe("aggregateRequiredDocuments", () => {
  it("aggregates document requirements across matching products", () => {
    const products = [
      {
        category: "Equipment Financing",
        requiredDocs: ["bank_statements", "equipment_quote"],
      },
      {
        category: "Equipment Financing",
        requiredDocs: ["ownership_info"],
      },
    ];
    const requirements = aggregateRequiredDocuments(
      products,
      "Equipment Financing",
      50000
    );
    const docTypes = requirements.map((entry) => entry.document_type);
    // BF_CLIENT_BLOCK_v877_NO_APPENDAGE_v1 — v156/v158 made the server the
    // single source of truth; the client no longer appends snake_case
    // always-required docs (they collided with the server's canonical
    // strings and broke the submit gate).
    expect(docTypes.sort()).toEqual(
      ["bank_statements", "equipment_quote", "ownership_info"].sort()
    );
  });

  it("filters requirements by category and amount", () => {
    const products = [
      {
        category: "Line of Credit",
        required_documents: [
          { document_type: "tax_returns", min_amount: 50000 },
          { document_type: "balance_sheet", max_amount: 20000 },
        ],
      },
      {
        category: "Term Loan",
        required_documents: ["profit_loss"],
      },
    ];
    const requirements = aggregateRequiredDocuments(
      products,
      "Line of Credit",
      75000
    );
    const docTypes = requirements.map((entry) => entry.document_type);
    // BF_CLIENT_BLOCK_v877_NO_APPENDAGE_v1 — server is the source of truth;
    // only the matched per-product doc remains (no client appendage).
    expect(docTypes.sort()).toEqual(["tax_returns"].sort());
  });
});

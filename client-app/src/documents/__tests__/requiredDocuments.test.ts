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
    // BF_CLIENT_WIZARD_STEP5_PHOTOIDS_v60 — primary_applicant_id is
    // an always-required entry now that photo IDs live on Step 5.
    expect(docTypes.sort()).toEqual(
      [
        "bank_statements",
        "equipment_quote",
        "ownership_info",
        "primary_applicant_id",
      ].sort()
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
    // BF_CLIENT_WIZARD_STEP5_PHOTOIDS_v60 — primary_applicant_id is
    // an always-required entry now that photo IDs live on Step 5.
    expect(docTypes.sort()).toEqual(
      ["bank_statements", "primary_applicant_id", "tax_returns"].sort()
    );
  });
});

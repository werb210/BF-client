// BF_CLIENT_BLOCK_v102_DOC_CATEGORY_FIELD_v1
// Server stores per-product docs as {category, required, description}.
// Pre-v102, normalizeRequirementList only accepted document_type and
// silently dropped everything else, leaving Step 5 with just the
// always-required fallback (bank statements + primary photo ID) for any
// real lender product. This regression test pins the exact production
// shape from BF-portal LendersPage.tsx:537.
import { describe, expect, it } from "vitest";
import { normalizeRequirementList } from "../requirements";

// BF_CLIENT_BLOCK_v102_HOTFIX_TEST_TYPING_v1
// Mirrors the production JSONB row shape written by BF-portal
// LendersPage.tsx:537 — { category, required, description }.
// Explicit type avoids TS7018 (implicit any) on inline `description: null`.
type ProductDocRow = {
  category: string;
  required: boolean;
  description: string | null;
};

describe("normalizeRequirementList — production doc shape (v102)", () => {
  it("accepts the {category, required, description} shape", () => {
    const raw: ProductDocRow[] = [
      { category: "3 years accountant prepared financials", required: true, description: null },
      { category: "PnL — Interim financials", required: true, description: null },
      { category: "A/R", required: true, description: null },
      { category: "2 pieces of Government Issued ID", required: true, description: null },
      { category: "Personal net worth statement", required: true, description: null },
      { category: "Corporate structure / org chart", required: true, description: null },
      { category: "Accounts payable aging report", required: true, description: null },
      { category: "Balance Sheet — Interim financials", required: true, description: null },
      { category: "A/P", required: true, description: null },
      { category: "VOID cheque or PAD", required: true, description: null },
      { category: "Accounts receivable aging report", required: true, description: null },
    ];
    const out = normalizeRequirementList(raw);
    expect(out.length).toBe(11);
    expect(out[0].document_type).toBe("3 years accountant prepared financials");
    expect(out[0].required).toBe(true);
  });

  it("accepts the legacy {document_type} shape", () => {
    const raw = [
      { id: "x", document_type: "bank_statements", required: true },
    ];
    const out = normalizeRequirementList(raw);
    expect(out.length).toBe(1);
    expect(out[0].document_type).toBe("bank_statements");
  });

  it("accepts the {name} shape as a last resort", () => {
    const raw = [{ name: "Custom doc", required: true }];
    const out = normalizeRequirementList(raw);
    expect(out.length).toBe(1);
    expect(out[0].document_type).toBe("Custom doc");
  });

  it("filters entries with no usable label", () => {
    const raw = [{ required: true }, { description: "no label" }, "  "];
    const out = normalizeRequirementList(raw as unknown[]);
    expect(out.length).toBe(0);
  });

  it("accepts plain strings (already supported pre-v102, must not regress)", () => {
    const out = normalizeRequirementList(["A/R", "Bank statements"]);
    expect(out.length).toBe(2);
    expect(out.map((e) => e.document_type)).toEqual(["A/R", "Bank statements"]);
  });
});

// BF_CLIENT_BLOCK_v102_MEDIA_NO_GLOBAL_DOCS_v1
// Pinned: MEDIA / Film Finance applications must surface ONLY the
// lender-product-configured docs (Budget, Finance plan, Tax credit
// status, Production schedule, Minimum guarantees / presales). Unlike
// every other category, MEDIA does not get the global always-required
// appendage of bank statements + primary applicant photo ID.
// BF_CLIENT_BLOCK_v102_HOTFIX_TEST_TYPING_v2 — every fixture has an
// explicit type so noImplicitAny does not flag null literals on
// description / min_amount / max_amount as implicit any.
import { describe, expect, it } from "vitest";
import {
  aggregateRequiredDocuments,
  ensureAlwaysRequiredDocuments,
} from "../requiredDocuments";
import type { LenderProductRequirement } from "../../wizard/requirements";

type RawProductDoc = {
  category: string;
  required: boolean;
  description: string | null;
};

describe("ensureAlwaysRequiredDocuments — MEDIA carve-out (v102)", () => {
  const mediaDocs: LenderProductRequirement[] = [
    { id: "budget", document_type: "Budget", required: true, min_amount: null, max_amount: null },
    { id: "fp", document_type: "Finance plan", required: true, min_amount: null, max_amount: null },
    { id: "tcs", document_type: "Tax credit status", required: true, min_amount: null, max_amount: null },
    { id: "ps", document_type: "Production schedule", required: true, min_amount: null, max_amount: null },
    { id: "mgp", document_type: "Minimum guarantees / presales", required: true, min_amount: null, max_amount: null },
  ];

  it("returns MEDIA list unchanged — no bank statements, no photo ID", () => {
    const out = ensureAlwaysRequiredDocuments(mediaDocs, { category: "MEDIA" });
    expect(out.map((e) => e.document_type)).toEqual([
      "Budget",
      "Finance plan",
      "Tax credit status",
      "Production schedule",
      "Minimum guarantees / presales",
    ]);
  });

  it("MEDIA carve-out is case-insensitive and trims whitespace", () => {
    for (const cat of ["media", "Media", "  MEDIA  "]) {
      const out = ensureAlwaysRequiredDocuments(mediaDocs, { category: cat });
      expect(out.length).toBe(5);
      expect(out.find((e) => e.document_type === "bank_statements")).toBeUndefined();
      expect(out.find((e) => e.document_type === "primary_applicant_id")).toBeUndefined();
    }
  });

  it("non-MEDIA categories still get the global always-required appendage", () => {
    const locDocs: LenderProductRequirement[] = [
      { id: "ar", document_type: "A/R", required: true, min_amount: null, max_amount: null },
    ];
    const out = ensureAlwaysRequiredDocuments(locDocs, { category: "LOC" });
    const docTypes = out.map((e) => e.document_type);
    expect(docTypes).toContain("A/R");
    expect(docTypes).toContain("primary_applicant_id");
    expect(out.length).toBeGreaterThanOrEqual(3);
  });

  it("missing category opts behaves as non-MEDIA (legacy callers)", () => {
    const out = ensureAlwaysRequiredDocuments([], {});
    expect(out.length).toBeGreaterThanOrEqual(2);
    expect(out.find((e) => e.document_type === "primary_applicant_id")).toBeDefined();
  });

  it("aggregateRequiredDocuments threads category through to ensure...", () => {
    const products: Array<{ category: string; required_documents: RawProductDoc[] }> = [
      {
        category: "MEDIA",
        required_documents: [
          { category: "Budget", required: true, description: null },
          { category: "Finance plan", required: true, description: null },
          { category: "Tax credit status", required: true, description: null },
          { category: "Production schedule", required: true, description: null },
          { category: "Minimum guarantees / presales", required: true, description: null },
        ],
      },
    ];
    const out = aggregateRequiredDocuments(products as any, "MEDIA", 250000);
    const docTypes = out.map((e) => e.document_type);
    expect(docTypes).toEqual([
      "Budget",
      "Finance plan",
      "Tax credit status",
      "Production schedule",
      "Minimum guarantees / presales",
    ]);
    expect(docTypes).not.toContain("primary_applicant_id");
  });
});

// BF_CLIENT_BLOCK_v156_DOC_SOURCE_OF_TRUTH_v1 (supersedes v119 always-required appendage)
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { aggregateRequiredDocuments } from "../../documents/requiredDocuments";

describe("Step 5 prefers server required-docs and does not inject snake_case appendage", () => {
  it("returns only the per-product docs (no bank_statements/primary_applicant_id appendage)", () => {
    const products = [{ category: "TERM", required_documents: [
      { document_type: "3 years business tax returns", required: true },
      { document_type: "Balance Sheet – Interim financials", required: true },
    ] }];
    const requirements = aggregateRequiredDocuments(products, "TERM_LOAN", 1_000_000);
    const docTypes = requirements.map((e) => e.document_type).sort();
    expect(docTypes).toEqual([
      "3 years business tax returns",
      "Balance Sheet – Interim financials",
    ].sort());
  });

  it("Step5_Documents.tsx contains the v119 server-prefer sentinel and the fallback guard", () => {
    const here = resolve(__dirname, "../Step5_Documents.tsx");
    const src = readFileSync(here, "utf8");
    expect(src).toContain("BF_CLIENT_BLOCK_v119_STEP5_PREFER_SERVER_REQUIRED_DOCS_v1");
    expect(src).toContain("if (aggregated.length === 0)");
    expect(src).toContain("fetchRequiredDocsUnion");
  });
});

// BF_CLIENT_BLOCK_v119_STEP5_PREFER_SERVER_REQUIRED_DOCS_v1
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { aggregateRequiredDocuments } from "../../documents/requiredDocuments";

describe("v119 Step 5 prefers server required-docs union over client aggregation", () => {
  it("documents the long/short category mismatch the server fix already handles", () => {
    const products = [{ category: "TERM", required_documents: [
      { document_type: "3 years business tax returns", required: true },
      { document_type: "Balance Sheet – Interim financials", required: true },
    ] }];
    const requirements = aggregateRequiredDocuments(products, "TERM_LOAN", 1_000_000);
    const docTypes = requirements.map((e) => e.document_type).sort();
    expect(docTypes).toEqual(["bank_statements", "primary_applicant_id"].sort());
  });

  it("Step5_Documents.tsx contains the v119 sentinel and the fallback guard", () => {
    const here = resolve(__dirname, "../Step5_Documents.tsx");
    const src = readFileSync(here, "utf8");
    expect(src).toContain("BF_CLIENT_BLOCK_v119_STEP5_PREFER_SERVER_REQUIRED_DOCS_v1");
    expect(src).toContain("if (aggregated.length === 0)");
    expect(src).toContain("fetchRequiredDocsUnion");
  });
});

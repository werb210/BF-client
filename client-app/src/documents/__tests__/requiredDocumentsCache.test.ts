import { beforeEach, describe, expect, it } from "vitest";
import { syncRequiredDocumentsFromStatus } from "../requiredDocumentsCache";

describe("syncRequiredDocumentsFromStatus", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("merges required documents from status and ensures bank statements", () => {
    const status = {
      required_documents: ["tax_returns"],
    };
    const merged = syncRequiredDocumentsFromStatus(status);
    const docTypes = (merged || []).map((entry) => entry.document_type);
    // BF_CLIENT_WIZARD_STEP5_PHOTOIDS_v60 — primary_applicant_id is
    // an always-required entry now that photo IDs live on Step 5.
    expect(docTypes.sort()).toEqual(
      ["bank_statements", "primary_applicant_id", "tax_returns"].sort()
    );
  });
});

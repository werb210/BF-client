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
    expect(docTypes.sort()).toEqual(["bank_statements", "tax_returns"].sort());
  });
});

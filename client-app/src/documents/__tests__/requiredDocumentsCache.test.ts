// BF_CLIENT_BLOCK_v156_DOC_SOURCE_OF_TRUTH_v1
import { beforeEach, describe, expect, it } from "vitest";
import { syncRequiredDocumentsFromStatus } from "../requiredDocumentsCache";

describe("syncRequiredDocumentsFromStatus", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("merges required documents from status without injecting global appendage", () => {
    const status = { required_documents: ["tax_returns"] };
    const merged = syncRequiredDocumentsFromStatus(status);
    const docTypes = (merged || []).map((entry) => entry.document_type);
    expect(docTypes).toEqual(["tax_returns"]);
  });
});

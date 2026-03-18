import { beforeEach, describe, expect, it, vi } from "vitest";
import { syncRequiredDocumentsFromStatus } from "../requiredDocumentsCache";

describe("syncRequiredDocumentsFromStatus", () => {
  beforeEach(() => {
    vi.spyOn(localStorage, "getItem").mockReturnValue(null);
    vi.spyOn(localStorage, "setItem").mockImplementation(() => undefined);
    vi.spyOn(localStorage, "removeItem").mockImplementation(() => undefined);
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

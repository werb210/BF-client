// @vitest-environment node
// BF_CLIENT_DOCUMENT_DUPLICATE_CHECK_v258 - node environment: real Blob + WebCrypto, as in browsers.
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { duplicateMessage, findUploadedDuplicate, fingerprintFile, isServerDuplicate } from "../documentFingerprint";

const label = (t: string) => ({ balance_sheet: "Balance Sheet - Interim financials", ap_aging: "A/P" } as Record<string, string>)[t] ?? t;

describe("fingerprint", () => {
  it("is the same for identical bytes and different otherwise", async () => {
    const a = await fingerprintFile(new Blob(["Voss Events Balance Sheet"]));
    const b = await fingerprintFile(new Blob(["Voss Events Balance Sheet"]));
    const c = await fingerprintFile(new Blob(["Voss Events P&L"]));
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});

describe("finding a duplicate already on the application", () => {
  const documents = {
    balance_sheet: { files: [{ name: "Voss Events Balance Sheet - 4.30.26 (1).pdf", hash: "h1" }] },
    bank_statements: { files: [{ name: "20260831-statements.pdf", hash: "h2" }, { name: "legacy.pdf" }] },
  };
  it("finds the spot holding the same file", () => {
    expect(findUploadedDuplicate(documents, "h1")).toEqual({ docType: "balance_sheet", name: "Voss Events Balance Sheet - 4.30.26 (1).pdf" });
    expect(findUploadedDuplicate(documents, "zz")).toBeNull();
    expect(findUploadedDuplicate(documents, null)).toBeNull();
  });
  it("words the message for the same spot and for a different spot", () => {
    expect(duplicateMessage("balance_sheet", { docType: "balance_sheet" }, label)).toBe("You've already uploaded this file here.");
    expect(duplicateMessage("ap_aging", { docType: "balance_sheet" }, label))
      .toBe("This file is already uploaded under Balance Sheet - Interim financials. Each document only needs to be uploaded once, in the right place.");
  });
  it("recognises the server's duplicate refusal", () => {
    expect(isServerDuplicate(Object.assign(new Error("DUPLICATE_DOCUMENT"), { status: 409 }))).toBe(true);
    expect(isServerDuplicate(Object.assign(new Error("APPLICATION_NOT_ACCEPTING_UPLOADS"), { status: 409 }))).toBe(false);
  });
});

describe("wiring", () => {
  const step5 = fs.readFileSync(path.resolve(__dirname, "../../wizard/Step5_Documents.tsx"), "utf8");
  it("checks before uploading, remembers the fingerprint, and explains a server refusal", () => {
    expect(step5.indexOf("findUploadedDuplicate(app.documents")).toBeGreaterThan(-1);
    expect(step5.indexOf("findUploadedDuplicate(app.documents")).toBeLessThan(step5.indexOf("ClientAppAPI.uploadDocument({"));
    expect(step5).toContain("hash: fileHash }");
    expect(step5).toContain("isServerDuplicate(err)");
  });
});

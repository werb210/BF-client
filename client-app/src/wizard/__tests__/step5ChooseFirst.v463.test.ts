// BF_CLIENT_BLOCK_v463_STEP5_CHOOSE_FIRST
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const src = readFileSync(join(process.cwd(), "src", "wizard", "Step5_Documents.tsx"), "utf-8");

describe("v463 step 5: choose first, then see only that path", () => {
  it("offers exactly three options before any upload fields", () => {
    expect(src).toContain("missingRequiredDocs.length > 0 && docChoice === null && (");
    expect(src).toContain("Upload my documents now");
    expect(src).toContain("I will supply all required documents at a later time");
    expect(src).toContain("Have my accountant upload the documents");
  });
  it("shows the upload list only on the upload path (or when nothing is missing)", () => {
    const gate = src.indexOf('(missingRequiredDocs.length === 0 || docChoice === "now") && (');
    const list = src.indexOf("groupedRequirements.map");
    expect(gate).toBeGreaterThan(-1);
    expect(list).toBeGreaterThan(gate);
  });
  it("supply later confirms and finalizes on the existing defer path", () => {
    expect(src).toContain('docChoice === "later"');
    expect(src).toContain("Finalize my application");
    expect(src).toContain("onClick={uploadLater}");
  });
  it("the accountant option opens its form", () => {
    expect(src).toContain('data-testid="step5-accountant-btn"');
    expect(src).toContain("onClick={() => setAccountantOpen(true)}");
  });
  it("the applicant can change their mind", () => {
    expect(src).toContain("Choose a different option");
    expect(src).toContain("onClick={() => setDocChoice(null)}");
  });
  it("returning to the step reopens the path already taken", () => {
    expect(src).toContain('if (app.documentsDeferred) return "later";');
    expect(src).toContain('Object.values(app.documents ?? {}).some(Boolean) ? "now" : null');
  });
  it("Continue belongs to the upload path only", () => {
    const cont = src.lastIndexOf(">\n            Continue\n");
    const gate = src.lastIndexOf('(missingRequiredDocs.length === 0 || docChoice === "now") && (', cont);
    expect(gate).toBeGreaterThan(src.indexOf("stickyCta"));
  });
});

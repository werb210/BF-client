// BF_CLIENT_STAGE2_UPLOADS_v205
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const stage2 = readFileSync(resolve(__dirname, "..", "Stage2Page.tsx"), "utf-8");
const picker = readFileSync(
  resolve(__dirname, "..", "..", "..", "..", "components", "DocPicker.tsx"),
  "utf-8",
);

describe("upload completion", () => {
  it("no longer reads upload state from the forms table", () => {
    expect(stage2).not.toContain("const isComplete = !!response?.submitted_at;");
    expect(stage2).toContain("isComplete = isForm ? !!response?.submitted_at : !stillOutstanding");
  });

  it("draft state applies to forms only", () => {
    expect(stage2).toContain("const isDraft = isForm && !!response");
  });

  it("a failed documents-needed call does not blank the page", () => {
    expect(stage2).toContain("setUploadedCategories(new Set());");
  });
});

describe("aimed upload", () => {
  it("the row tells the picker which document it wants", () => {
    expect(stage2).toContain("setUploadFor({ type: doc.document_type");
    expect(stage2).toContain("documentType={uploadFor?.type}");
  });

  it("an aimed picker does not depend on the needed list", () => {
    expect(picker).toContain("if (documentType) {");
    expect(picker).toContain("setLoading(false);");
  });

  it("the picker still works unaimed from the right rail", () => {
    expect(picker).toContain("/api/client/documents-needed/needed?applicationId=");
  });

  it("clearing the aim on close prevents it leaking to the next row", () => {
    expect(stage2).toContain("setUploadFor(null); void load();");
  });
});

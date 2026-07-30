import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (...parts: string[]) => readFileSync(join(process.cwd(), "src", ...parts), "utf-8");
const step4 = read("wizard", "Step4_Applicant.tsx");
const maya = read("components", "MayaWidget.tsx");
const portal = read("pages", "MiniPortalPage.tsx");
const css = read("styles", "global.css");

describe("BF_CLIENT_IOS_MIC_AND_LAYOUT_v1", () => {
  it("gives iOS the tokens it needs to offer the contact card", () => {
    for (const token of ["given-name", "family-name", "email", "bday", "address-level2", "postal-code"]) {
      expect(step4).toContain(`autoComplete="${token}"`);
    }
  });

  it("keeps the identity number out of autofill", () => {
    expect(step4).toContain('inputMode="numeric" autoComplete="off"');
  });

  it("caps the Maya panel to the visible viewport", () => {
    expect(maya).toContain("max-w-[100vw]");
    expect(maya).not.toContain("h-[100dvh] w-full");
  });

  it("stops the application switcher widening the document", () => {
    expect(portal).toContain("flex: 1, minWidth: 0, maxWidth: 520");
  });

  it("guards the document against sideways scroll", () => {
    expect(css).toContain("overflow-x: hidden");
  });
});

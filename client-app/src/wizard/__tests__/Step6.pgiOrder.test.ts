import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe("BF_CLIENT_WIZARD_STEP6_PGI_v61 — Step 6 section order", () => {
  const src = readFileSync(join(__dirname, "../Step6_Review.tsx"), "utf8");

  it("contains the PGI section", () => {
    expect(src).toContain("Personal Guarantee Insurance (PGI)");
    expect(src).toContain('data-testid="step6-pgi-section"');
  });

  it("captures pgiOptIn into the application store", () => {
    expect(src).toContain('update({ pgiOptIn: "yes" })');
    expect(src).toContain('update({ pgiOptIn: "no" })');
  });

  it("renders sections in canonical order: PGI → T&C → checkboxes → signature → submit", () => {
    const pgi = src.indexOf("Personal Guarantee Insurance (PGI)");
    const terms = src.indexOf("{TERMS_TEXT}");
    const infoCk = src.indexOf("I confirm the information is accurate");
    const authCk = src.indexOf("I authorize Boreal Financial to share");
    const agreeCk = src.indexOf("I agree to the Terms & Conditions");
    const sig = src.indexOf("Typed signature");
    const submit = src.indexOf("Submit Application");
    expect(pgi).toBeLessThan(terms);
    expect(terms).toBeLessThan(infoCk);
    expect(infoCk).toBeLessThan(authCk);
    expect(authCk).toBeLessThan(agreeCk);
    expect(agreeCk).toBeLessThan(sig);
    expect(sig).toBeLessThan(submit);
  });
});
// BF_CLIENT_WIZARD_STEP6_PGI_v61_TEST_ANCHOR

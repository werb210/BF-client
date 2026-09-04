// BF_CLIENT_WIZARD_MODAL_CSS_v147
// Both Step 1 hard stops used class names no stylesheet defined, so the message
// explaining a dead Continue button rendered off-screen.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "..", "..");
const css = readFileSync(resolve(root, "theme", "global.css"), "utf-8");
const step1 = readFileSync(resolve(root, "wizard", "Step1_KYC.tsx"), "utf-8");
const main = readFileSync(resolve(root, "main.tsx"), "utf-8");

describe("every modal class the wizard uses is defined", () => {
  it.each(["wizard-modal-backdrop", "wizard-modal"])("%s has a rule", (cls) => {
    expect(step1).toContain(`className="${cls}"`);
    expect(css).toContain(`.${cls} {`);
  });

  it("lives in the stylesheet main.tsx actually imports", () => {
    expect(main).toContain('import "./theme/global.css"');
  });
});

describe("it renders as an overlay, not as text at the bottom of the page", () => {
  it("is fixed and covers the viewport", () => {
    const i = css.indexOf(".wizard-modal-backdrop {");
    const rule = css.slice(i, css.indexOf("}", i));
    expect(rule).toContain("position: fixed");
    expect(rule).toContain("inset: 0");
  });

  it("sits above the sticky action bar", () => {
    const i = css.indexOf(".wizard-modal-backdrop {");
    expect(css.slice(i, css.indexOf("}", i))).toMatch(/z-index:\s*\d{3,}/);
  });

  it("scrolls internally so the dismiss button is always reachable", () => {
    const i = css.indexOf(".wizard-modal {");
    const rule = css.slice(i, css.indexOf("}", i));
    expect(rule).toContain("max-height: 90vh");
    expect(rule).toContain("overflow-y: auto");
  });
});

describe("the hard stops it explains", () => {
  it("the Canadian revenue floor still gates Continue - the fix is visibility, not policy", () => {
    // BF_CLIENT_STEP1_CA_REVENUE_REQUIRED_v171 - the gate is now a CA-required
    // ternary; the below-floor band still blocks in Canada (and blank does too).
    expect(step1).toContain('values.monthlyRevenue === "Under $10,000"');
    expect(step1).toContain('countryCode === "CA"');
  });

  it("and the answer is still kept, so staff can see what they picked", () => {
    expect(step1).toContain("update({ kyc: { ...app.kyc, monthlyRevenue: value } });");
  });
});

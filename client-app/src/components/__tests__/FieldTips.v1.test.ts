// BF_CLIENT_FIELD_TIPS_v1 - field-help tooltips are mounted once via
// StepHeader and driven by label text through content/fieldHelp.ts.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
const header = readFileSync(join(process.cwd(), "src", "components", "StepHeader.tsx"), "utf-8");
const tips = readFileSync(join(process.cwd(), "src", "components", "FieldTips.tsx"), "utf-8");
const help = readFileSync(join(process.cwd(), "src", "content", "fieldHelp.ts"), "utf-8");
describe("wizard field tips", () => {
  it("StepHeader mounts FieldTips for every step", () => {
    expect(header).toContain("<FieldTips />");
  });
  it("tips are label-text driven and duplicate-safe", () => {
    expect(tips).toContain("helpForLabel");
    expect(tips).toContain("borealTipDone");
  });
  it("help copy exists for key fields", () => {
    expect(help).toContain('"Ownership %"');
    expect(help).toContain('"Business Legal Name (if applicable)"');
  });
});

// BF_CLIENT_BLOCK_v861_EQUIP_PARENT_LEG_ONLY — guards that the parent
// equipment application's Step 5 aggregates ONLY its own equipment leg and
// never re-introduces the phantom closing-cost companion leg (TERM/LOC) whose
// lender-product forms (Flinks / CRA / Professional advisors) previously
// contaminated the equipment app's required documents.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Step 5 equipment parent aggregates its own leg only", () => {
  const src = readFileSync(resolve(__dirname, "../Step5_Documents.tsx"), "utf8");
  it("carries the v861 sentinel", () => {
    expect(src).toContain("BF_CLIENT_BLOCK_v861_EQUIP_PARENT_LEG_ONLY");
  });
  it("no longer pushes a TERM/LOC closing-cost companion leg", () => {
    expect(src).not.toContain('companion <= 50_000 ? "TERM" : "LOC"');
    expect(src).not.toContain("closingCostsChecked");
  });
  it("equipment-only branch still pushes the EQUIPMENT leg", () => {
    expect(src).toContain('legs.push({ category: "EQUIPMENT", amount: equipmentAmount });');
  });
});

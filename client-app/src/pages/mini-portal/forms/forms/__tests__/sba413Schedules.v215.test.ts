// BF_CLIENT_SBA_413_SCHEDULES_v215
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const src = readFileSync(resolve(__dirname, "..", "Sba413Form.tsx"), "utf-8");
describe("schedules appear only when the summary line has a figure", () => {
  it.each([
    ["liab_notes_payable", "noteholders"], ["asset_real_estate", "properties"],
    ["asset_other_personal", "section5_other_property"], ["liab_unpaid_taxes", "section6_unpaid_taxes"],
    ["asset_life_insurance", "section8_life_insurance"], ["income_other", "other_income_description"],
  ])("%s gates %s", (line, schedule) => {
    expect(src).toContain(`amount("${line}") > 0`);
    expect(src).toContain(schedule);
  });
});
describe("repeating tables", () => {
  it("noteholders carry every column the PDF writes", () => {
    for (const f of ["name", "original_balance", "current_balance", "payment", "frequency", "collateral"]) expect(src).toContain(`field: "${f}"`);
  });
  it("properties carry every column the PDF writes", () => {
    for (const f of ["address", "type", "market_value", "mortgage_balance"]) expect(src).toContain(`field: "${f}"`);
  });
  it("respect the capacity of the paper form", () => {
    expect(src).toMatch(/SBA needs each lender listed\.\", 5,/);
    expect(src).toMatch(/List each property\.\", 3,/);
  });
  it("say what to do when there are more than the form holds", () => expect(src).toContain("we will attach a continuation sheet"));
  it("rows can be removed, not only added", () => expect(src).toContain("removeRow(listKey, index)"));
});
describe("persistence", () => {
  it("every schedule field saves on blur like the rest of the form", () => expect(src.match(/onBlur=\{persist\}/g)?.length ?? 0).toBeGreaterThanOrEqual(4));
});
describe("keys match the server builder", () => {
  it.each(["noteholders", "properties", "section5_other_property", "section6_unpaid_taxes", "section8_life_insurance", "other_income_description"])("%s", (k) => expect(src).toContain(k));
});

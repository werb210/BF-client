// BF_CLIENT_STEP4_ADDRESS_SINCE_v139
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { underTenYearsAtAddress } from "../Step4_Applicant";

const step4 = readFileSync(resolve(__dirname, "..", "Step4_Applicant.tsx"), "utf-8");

describe("the 912 ten-year rule", () => {
  it("blank keeps the follow-up visible - unanswered is not the same as over ten years", () => {
    expect(underTenYearsAtAddress("")).toBe(true);
    expect(underTenYearsAtAddress(null)).toBe(true);
    expect(underTenYearsAtAddress(undefined)).toBe(true);
  });
  it("an unparseable value keeps it visible rather than hiding a required answer", () => {
    expect(underTenYearsAtAddress("last year")).toBe(true);
    expect(underTenYearsAtAddress("2015")).toBe(true);
  });
  it("recent moves ask for the prior address", () => {
    const d = new Date();
    const recent = `${d.getFullYear() - 3}-0${(d.getMonth() % 9) + 1}`;
    expect(underTenYearsAtAddress(recent)).toBe(true);
  });
  it("over ten years does not", () => {
    const d = new Date();
    expect(underTenYearsAtAddress(`${d.getFullYear() - 15}-01`)).toBe(false);
  });
  it("the boundary sits at 120 months", () => { expect(step4).toContain("months < 120"); });
});

describe("SBA collects the residence date the 912 needs", () => {
  it("asks for it inside the 912 block", () => {
    const i = step4.indexOf("SBA personal history (Form 912)");
    const block = step4.slice(i, i + 4000);
    expect(block).toContain('setField("addressSince", v)');
  });
  it("does not render two controls for the same field", () => {
    expect(step4).toContain("isAccordLOC && !onSba");
    expect((step4.match(/setField\("addressSince"/g) || []).length).toBe(2);
  });
});

describe("two columns", () => {
  it("former names is paired rather than left with an empty cell", () => {
    const i = step4.indexOf("Any former names used");
    const after = step4.slice(i, i + 900);
    expect(after).toContain("At this address since");
    const pairIdx = after.indexOf("At this address since");
    const fullWidthIdx = after.indexOf('gridColumn: "1 / -1"');
    expect(pairIdx).toBeLessThan(fullWidthIdx === -1 ? Number.MAX_SAFE_INTEGER : fullWidthIdx);
  });
  it("the previous address is conditional, not always shown", () => {
    expect(step4).toContain("underTenYearsAtAddress(data.addressSince) && (");
  });
});

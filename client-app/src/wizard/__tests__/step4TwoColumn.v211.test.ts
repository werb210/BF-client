// BF_CLIENT_STEP4_TWO_COLUMN_v211
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const src = readFileSync(resolve(__dirname, "..", "Step4_Applicant.tsx"), "utf-8");

function wrapperAbove(marker: string): string {
  const i = src.indexOf(marker);
  expect(i).toBeGreaterThan(-1);
  return src.slice(Math.max(0, i - 220), i);
}

describe("Form 912 questions", () => {
  it.each([
    "Are you currently incarcerated, serving a sentence, or under indictment",
    "In the past year, have you been convicted of a criminal offence",
    "Are you currently more than 60 days late on any child support",
    "Your initials, confirming the three answers above",
  ])("%s is no longer full width", (marker) => {
    expect(wrapperAbove(marker)).not.toContain('gridColumn: "1 / -1"');
  });
});

describe("what stays full width", () => {
  it("section headings still span both columns", () => {
    expect(src).toContain('gridColumn: "1 / -1", ...components.form.eyebrow');
  });

  it("the mailing address keeps its width", () => {
    expect(wrapperAbove("Mailing Address")).toContain('gridColumn: "1 / -1"');
  });

  it("the previous-address free text keeps its width", () => {
    expect(wrapperAbove("Previous address, if you have been at your current address")).toContain('gridColumn: "1 / -1"');
  });
});

describe("the container itself", () => {
  it("was already two-column and is unchanged", () => {
    expect(src).toContain('gridTemplateColumns: typeof window !== "undefined" && window.innerWidth < 600 ? "1fr" : "1fr 1fr"');
  });
});

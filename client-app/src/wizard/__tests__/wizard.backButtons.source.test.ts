import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(p: string): string {
  return readFileSync(resolve(__dirname, "..", p), "utf8");
}

describe("Back-button presence", () => {
  it("Step3_Business.tsx renders Back -> step-2", () => {
    const src = read("Step3_Business.tsx");
    expect(src).toMatch(/navigate\(\s*["']\/apply\/step-2["']\s*\)/);
    expect(src).toMatch(/Back/);
  });
  it("Step4_Applicant.tsx renders Back -> step-3", () => {
    const src = read("Step4_Applicant.tsx");
    expect(src).toMatch(/navigate\(\s*["']\/apply\/step-3["']\s*\)/);
    expect(src).toMatch(/Back/);
  });
});

// BF_CLIENT_OWNERSHIP_20_v145
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const step4 = readFileSync(resolve(__dirname, "..", "Step4_Applicant.tsx"), "utf-8");

describe("the ownership threshold matches the form", () => {
  it("asks for 20%, which is what the 1919 requires", () => {
    expect(step4).toContain("List everyone with 20%+ ownership");
  });

  it("no longer says 25% anywhere", () => {
    expect(step4).not.toContain("25%");
  });

  it("stays consistent with the comments already in this file", () => {
    expect(step4).toContain("20% or more");
  });
});

// BF_CLIENT_ACCURATE_CLAIMS_v700
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("landing reassurance matches boreal.financial", () => {
  it("says no credit pull to apply, not that credit is never pulled", () => {
    const s = readFileSync("src/pages/LandingPage.tsx", "utf8");
    expect(s).toContain('"No credit pull to apply"');
    expect(s).not.toContain("We never pull your credit");
  });
});

// BF_CLIENT_FEE_CLOSE_FAST_v727
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

describe("fee agreement window", () => {
  it("checks for the signature every 3 seconds so it closes soon after Finish", () => {
    const s = readFileSync("src/components/FeeAgreementSignModal.tsx", "utf8");
    expect(s).toContain("void confirm(); }, 3000);");
    expect(s).not.toContain("}, 15000);");
  });
});

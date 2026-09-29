// BF_CLIENT_MAIN_LINE_866_v692
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("call-us numbers in the client app", () => {
  it("are the 866 main line", () => {
    for (const f of ["src/wizard/Step1_KYC.tsx", "src/pages/mini-portal/forms/forms/Sba1919Form.tsx", "src/pages/mini-portal/forms/forms/Sba413Form.tsx"]) {
      const s = readFileSync(f, "utf8");
      expect(s).not.toMatch(/451-1768|4511768/);
      expect(s).toContain("(866) 631-8939");
    }
  });
});

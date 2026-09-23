// BF_CLIENT_APPLICATION_TOKEN_SECURE_v423
import { describe, expect, it, beforeEach } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import {
  setApplicationToken,
  getApplicationToken,
  clearApplicationToken,
  APPLICATION_TOKEN_KEY,
} from "../applicationToken";

const read = (p: string) => readFileSync(path.join(process.cwd(), p), "utf8");
const sites = [
  "src/components/PhoneOTPInline.tsx",
  "src/wizard/Step1_KYC.tsx",
  "src/wizard/Step4_Applicant.tsx",
  "src/wizard/Step6_Review.tsx",
];

describe("v423 the application token has one owner", () => {
  beforeEach(() => localStorage.clear());

  it("round-trips on web", () => {
    setApplicationToken("abc-123");
    expect(getApplicationToken()).toBe("abc-123");
    expect(localStorage.getItem(APPLICATION_TOKEN_KEY)).toBe("abc-123");
  });

  it("clears completely", () => {
    setApplicationToken("abc-123");
    clearApplicationToken();
    expect(getApplicationToken()).toBeNull();
    expect(localStorage.getItem(APPLICATION_TOKEN_KEY)).toBeNull();
  });

  it("ignores an empty token instead of storing junk", () => {
    setApplicationToken("   ");
    expect(getApplicationToken()).toBeNull();
  });

  it("no wizard step writes the key directly any more", () => {
    for (const p of sites) {
      if (!existsSync(path.join(process.cwd(), p))) continue;
      expect(read(p)).not.toMatch(/localStorage\.setItem\(\s*['"]bf_application_token['"]/);
    }
  });

  it("uses the Keychain slot that already exists, not a new dependency", () => {
    const src = read("src/auth/applicationToken.ts");
    expect(src).toContain("namedCredentialStore");
    expect(src).toContain("pendingWrite");
  });

  it("hydrates at boot after the session token", () => {
    expect(read("src/main.tsx")).toContain("hydrateApplicationToken");
  });
});

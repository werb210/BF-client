import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

// BF_CLIENT_REFERRAL_REF_v1 - guards that the wizard captures the referral code
// from the landing page (?ref=) into first-touch attribution, so it rides
// through /api/public/application/start to BF-Server's metadata.attribution.ref
// and credits the referrer at application-accepted.
const src = readFileSync(
  join(process.cwd(), "src/lib/attribution.ts"),
  "utf8",
);

describe("referral ref capture", () => {
  it("declares ref on the Attribution type", () => {
    expect(src).toContain("ref?: string");
  });

  it("reads the ?ref query param and stores it", () => {
    expect(src).toContain('p.get("ref")');
    expect(src).toContain("a.ref = ref");
  });
});

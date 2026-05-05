// BF_CLIENT_BLOCK_v130b_STEP5_SCROLL_AND_OTP_PHONE_CLAIM_v1
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("BF_CLIENT_BLOCK_v130b_STEP5_SCROLL_AND_OTP_PHONE_CLAIM_v1 — Step 5 scroll", () => {
  const src = readFileSync(
    join(__dirname, "..", "Step5_Documents.tsx"),
    "utf8"
  );

  it("anchor present in Step5_Documents.tsx", () => {
    expect(src).toContain(
      "BF_CLIENT_BLOCK_v130b_STEP5_SCROLL_AND_OTP_PHONE_CLAIM_v1"
    );
  });

  it("the broad scrollToFirstError useEffect is gone", () => {
    const offending = "[docError, hasBlockingUploadErrors, missingRequiredDocs.length]";
    const occurrences = src.split(offending).length - 1;
    expect(occurrences).toBe(0);
  });

  it("scrollToFirstError() is called inside next() on the missing-docs branch", () => {
    const nextStart = src.indexOf("function next() {");
    expect(nextStart).toBeGreaterThan(-1);
    const nextSiblingStart = src.indexOf("\n  function ", nextStart + 1);
    const nextBody = src.slice(
      nextStart,
      nextSiblingStart > -1 ? nextSiblingStart : nextStart + 4000
    );
    expect(nextBody).toMatch(
      /Please upload all required documents[\s\S]{0,400}scrollToFirstError\(\)[\s\S]{0,200}return;/
    );
  });

  it("scrollToFirstError import is preserved", () => {
    expect(src).toContain("scrollToFirstError");
    expect(src).toMatch(
      /import\s*{[^}]*scrollToFirstError[^}]*}\s*from\s*"@\/styles"/
    );
  });
});

describe("BF_CLIENT_BLOCK_v130b_STEP5_SCROLL_AND_OTP_PHONE_CLAIM_v1 — OTP phone claim", () => {
  const src = readFileSync(
    join(__dirname, "..", "..", "components", "PhoneOTPInline.tsx"),
    "utf8"
  );

  it("anchor present in PhoneOTPInline.tsx", () => {
    expect(src).toContain(
      "BF_CLIENT_BLOCK_v130b_STEP5_SCROLL_AND_OTP_PHONE_CLAIM_v1"
    );
  });

  it("/application/start POST body uses readiness_phone, not bare phone", () => {
    expect(src).toContain("readiness_phone: phoneE164");
    const bodyLineIdx = src.indexOf("body: JSON.stringify({ source: 'client_direct'");
    expect(bodyLineIdx).toBeGreaterThan(-1);
    const bodyLine = src.slice(bodyLineIdx, src.indexOf("\n", bodyLineIdx));
    expect(bodyLine).not.toContain(" phone:");
    expect(bodyLine).toContain("readiness_phone:");
  });

  it("phoneE164 variable is still the value being sent (no accidental rename)", () => {
    expect(src).toMatch(/\bphoneE164\b/);
    expect(src).toContain("setPhoneE164");
  });
});

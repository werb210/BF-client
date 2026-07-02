import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const src = readFileSync(join(process.cwd(), "src/pages/mini-portal/forms/forms/PersonalNetWorthForm.tsx"), "utf-8");

describe("PNW signing fix", () => {
  it("keeps the form mounted for signing instead of closing on submit", () => {
    // onComplete() must no longer be called unconditionally right after setSigningUrl
    expect(src).toContain("BF_CLIENT_PNW_SIGN_FIX_v1");
    expect(src).not.toContain("if (resp?.signing_url) setSigningUrl(resp.signing_url);\n      onComplete();");
  });
  it("requires a signer email before submit", () => {
    expect(src).toContain("it is required to sign your Personal Net Worth");
  });
});

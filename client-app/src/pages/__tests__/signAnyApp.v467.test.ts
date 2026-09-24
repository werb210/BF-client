// BF_CLIENT_BLOCK_v467_SIGN_ANY_APP
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const src = readFileSync(join(process.cwd(), "src", "pages", "MiniPortalPage.tsx"), "utf-8");

describe("v467 a waiting signature shows whichever application is open", () => {
  it("shows a banner for every other application that needs a signature", () => {
    expect(src).toContain('.filter((a) => a?.signature_needed === true && String(a.id) !== String(applicationId))');
    expect(src).toContain("is ready for your signature.");
    expect(src).toContain('data-testid="cmp-sign-other-app"');
  });

  it("Sign now switches to that application and opens signing", () => {
    expect(src).toContain("navigate(`/application/${encodeURIComponent(String(a.id))}?sign=1`)");
    expect(src).toContain('if (searchParams.get("sign") === "1" && signSession?.status === "ready") setShowSign(true);');
  });

  it("the switcher marks the application that needs a signature", () => {
    expect(src).toContain('{a?.signature_needed === true ? " - signature needed" : ""}');
  });

  it("the banner sits above the application switcher", () => {
    expect(src.indexOf('data-testid="cmp-sign-other-app"')).toBeLessThan(src.indexOf('id="mp-app-switch"'));
  });
});

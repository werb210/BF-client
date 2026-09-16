// BF_CLIENT_SIGN_CTA_v294
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Sign now message button", () => {
  it("opens the signing panel", () => {
    const page = readFileSync(join(__dirname, "..", "MiniPortalPage.tsx"), "utf8");
    expect(page).toContain('if (ctaAction === "sign" || ctaAction === "sign_application") { onChip("sign"); return; }');
    expect(page).toContain('if (id === "sign") { setShowSign(true); void fetchSigningSession(); return; }');
  });
});

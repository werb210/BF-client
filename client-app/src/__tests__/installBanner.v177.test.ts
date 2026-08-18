// BF_CLIENT_INSTALL_v177 - the install prompt was covering the Continue button
// on Step 1, and carried a yellow that exists nowhere else.
import { describe, it, expect } from "vitest";
import fs from "fs";

const SRC = fs.readFileSync("src/components/InstallPromptBanner.tsx", "utf8");

describe("the banner is on brand", () => {
  it("dropped the off-brand ground and yellow", () => {
    expect(SRC).not.toContain("#020C1C");
    expect(SRC).not.toContain("#F5C443");
  });

  it("uses the shared navy and gold", () => {
    expect(SRC).toContain("background: tokens.colors.primary");
    expect(SRC).toContain("background: tokens.colors.accent");
    expect(SRC).toContain("color: tokens.colors.primary");
  });
});

describe("it does not cover the primary action", () => {
  it("clears the sticky footer instead of sitting on it", () => {
    expect(SRC).toContain("const STICKY_FOOTER_CLEARANCE = 88");
    expect(SRC).toContain("bottom: STICKY_FOOTER_CLEARANCE");
    expect(SRC).not.toContain("bottom: 16");
  });

  it("keeps both actions reachable on a phone", () => {
    expect(SRC.match(/minHeight: 40/g)?.length).toBe(2);
  });
});

// BF_CLIENT_APP_UPDATE_v723
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { isOutdated } from "../AppUpdateBanner";

describe("out-of-date phone app", () => {
  it("flags a build older than the server's minimum", () => {
    expect(isOutdated("2026-09-27T10:00:00Z", "2026-10-04T00:00:00Z")).toBe(true);
    expect(isOutdated("2026-10-05T10:00:00Z", "2026-10-04T00:00:00Z")).toBe(false);
  });
  it("never flags when it cannot tell", () => {
    expect(isOutdated(undefined, "2026-10-04T00:00:00Z")).toBe(false);
    expect(isOutdated("2026-09-27T10:00:00Z", undefined)).toBe(false);
  });
  it("is shown on the mini-portal with a Book a call link", () => {
    const page = readFileSync("src/pages/MiniPortalPage.tsx", "utf8");
    expect(page).toContain("<AppUpdateBanner />");
    expect(page).toContain('href="https://www.boreal.financial/book"'); // BF_CLIENT_WWW_LINKS_v726
    expect(readFileSync("vite.config.ts", "utf8")).toContain("VITE_APP_BUILT_AT");
  });
});

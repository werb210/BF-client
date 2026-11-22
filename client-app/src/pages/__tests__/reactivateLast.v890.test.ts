// BF_CLIENT_v890_REACTIVATE_LAST
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const src = readFileSync("src/pages/MiniPortalPage.tsx", "utf8");

describe("on-hold files on the client home", () => {
  it("come after the status, to-do, offer and meetings cards", () => {
    const at = src.indexOf("<ReactivateHeldFiles");
    for (const before of ["<CmpStatusCard", "<ActionCenter", "<CmpOffersCard", "<UpcomingMeetingsCard"]) {
      expect(src.indexOf(before)).toBeGreaterThan(-1);
      expect(src.indexOf(before)).toBeLessThan(at);
    }
    expect(at).toBeLessThan(src.indexOf('className={`mp-grid'));
  });
});

// BF_CLIENT_APP_GONE_v736
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const page = readFileSync("src/pages/MiniPortalPage.tsx", "utf8");

describe("a client portal pointing at an application that no longer exists", () => {
  it("counts refused (403/404) answers and stops polling after two in a row", () => {
    expect(page).toContain("if (status !== 403 && status !== 404 && !/(API|HTTP) (403|404)\\b/.test(");
    expect(page).toContain("if (goneStrikes.current >= 2) { appGoneRef.current = true; setAppGone(true); }");
    expect(page).toContain("if (!applicationId || appGoneRef.current) return;");
    expect(page).toContain(".then((r) => { goneStrikes.current = 0; return r; }).catch((e: unknown): null => { noteRefused(e); return null; })");
  });
  it("tells the client instead of showing an empty portal, and resets when they switch applications", () => {
    expect(page).toContain("We can't find this application");
    expect(page).toContain("goneStrikes.current = 0; appGoneRef.current = false; setAppGone(false); }, [applicationId]);");
  });
});

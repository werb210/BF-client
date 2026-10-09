// BF_CLIENT_SIGN_POLL_v747
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const page = readFileSync("src/pages/MiniPortalPage.tsx", "utf8");

describe("the client portal notices a signing sent while it is open", () => {
  it("re-checks the signing session on the visible-page poll", () => {
    expect(page).toContain("useVisiblePoll(pollSigningSession, 30000);");
  });
  it("stops checking once the documents are signed", () => {
    const fn = page.slice(page.indexOf("const pollSigningSession"), page.indexOf("useVisiblePoll(pollSigningSession"));
    expect(fn).toContain('if (signStatusRef.current === "signed") return;');
  });
});

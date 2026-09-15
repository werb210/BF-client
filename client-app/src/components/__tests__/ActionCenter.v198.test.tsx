// BF_CLIENT_ACTION_CENTER_v198
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const cmp = readFileSync("src/components/ActionCenter.tsx", "utf-8");
const page = readFileSync("src/pages/MiniPortalPage.tsx", "utf-8");

describe("action center", () => {
  it("never re-derives completion on the client", () => {
    // The whole point of v197 was one source of truth. Any local "is this done"
    // logic here recreates the drift it was built to remove.
    expect(cmp).not.toMatch(/uploaded\.has|submittedForms|completed\.includes/);
    expect(cmp).toContain("action-center?applicationId=");
  });

  it("renders nothing rather than blanking the portal when the call fails", () => {
    expect(cmp).toMatch(/catch \{[\s\S]{0,120}setFailed\(true\)/);
    expect(cmp).toContain("if (failed || !data) return null;");
  });

  it("tells the applicant plainly when a document was rejected", () => {
    expect(cmp).toContain("the last one was not accepted");
  });

  it("refreshes when the tab regains focus", () => {
    expect(cmp).toContain('window.addEventListener("focus", onFocus)');
    expect(cmp).toContain('window.removeEventListener("focus", onFocus)');
  });

  it("stays quiet when there is genuinely nothing to show", () => {
    expect(cmp).toContain("if (outstanding.length === 0 && completed.length === 0) return null;");
  });
});

describe("mounting", () => {
  it("is on the mini portal", () => {
    expect(page).toContain("BF_CLIENT_ACTION_CENTER_v198");
    expect(page).toContain("<ActionCenter applicationId={applicationId} />");
  });
});

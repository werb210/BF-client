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
    expect(cmp).toContain("if (failed || !isActionCenter(data)) return null;");
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

// BF_CLIENT_ACTION_CENTER_SHAPE_v206
describe("a response of the wrong shape", () => {
  it("is rejected rather than read blindly", () => {
    // The v198 crash: apiCall resolved with another endpoint's payload, so
    // data.outstanding was undefined and .length threw inside render, taking
    // MiniPortalPage down with it.
    expect(cmp).toContain("const isActionCenter = ");
    expect(cmp).toContain("Array.isArray((d as ActionCenterData).outstanding)");
    expect(cmp).toContain("Array.isArray((d as ActionCenterData).completed)");
  });

  it("is checked before the data is stored", () => {
    expect(cmp).toMatch(/if \(!isActionCenter\(d\)\) \{[\s\S]{0,80}setFailed\(true\);[\s\S]{0,40}return;/);
  });

  it("is checked again at the render site", () => {
    expect(cmp).toContain("if (failed || !isActionCenter(data)) return null;");
  });

  it("no longer types the fetch as the shape it hopes for", () => {
    expect(cmp).toContain("apiCall<unknown>(");
    expect(cmp).not.toContain("apiCall<ActionCenterData>(");
  });
});

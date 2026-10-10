// BF_CLIENT_TRACKER_FIT_v752
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";

const page = readFileSync("src/pages/MiniPortalPage.tsx", "utf8");
const css = readFileSync("src/pages/MiniPortalPage.css", "utf8");

describe("client portal stage tracker on a phone", () => {
  it("is not scrolled to centre the current stage", () => {
    expect(page).not.toContain('inline: "center"');
    expect(page).toContain("BF_CLIENT_TRACKER_FIT_v752");
  });
  it("fits all stages across a phone screen", () => {
    const i = css.indexOf("BF_CLIENT_TRACKER_FIT_v752");
    expect(i).toBeGreaterThan(-1);
    const block = css.slice(i);
    expect(block).toContain("@media (max-width: 640px)");
    expect(block).toContain(".mp-stage { min-width: 0; flex: 1 1 0; }");
    expect(block).toContain(".mp-tracker { overflow-x: visible;");
  });
  it("unused files that called missing server addresses are gone", () => {
    for (const f of ["src/api/liveChat.ts", "src/hooks/useClientSession.ts", "src/pages/apply/ApplyStep4.tsx", "src/hooks/useReadinessBridge.ts", "src/utils/submitApplication.ts", "src/features/application"]) {
      expect(existsSync(f)).toBe(false);
    }
  });
});

describe("phone tabs v752", () => {
  const cmp = readFileSync("src/components/CmpPhone.tsx", "utf8");
  const ccss = readFileSync("src/components/CmpPhone.css", "utf8");
  it("has a Settings tab holding Face ID / Sign out, Delete account and the version", () => {
    expect(cmp).toContain('{ id: "settings", label: "Settings" }');
    expect(page).toContain('{!isPhone || phoneTab === "settings" ? <AccountBar /> : null}');
    expect(page).toContain('data-cmp-tab="settings"');
    expect(ccss).toContain('.cmp-phone.cmp-tab-settings [data-cmp-tab]:not([data-cmp-tab="settings"])');
  });
  it("More no longer repeats Ask Maya on a phone", () => {
    expect(ccss).toContain('.cmp-phone .mp-actions [data-testid="ask-maya"] { display: none; }');
  });
  it("Home and To do both say when there is nothing to do", () => {
    expect(page).toContain('data-testid="cmp-home-caught-up"');
    expect(page).toContain("isPhone && todoLoaded && todoOpen.count + todoExtras.length === 0 ? (");
  });
  it("opens an application when the app lands on /portal without one", () => {
    expect(page).toContain('navigate("/application/" + encodeURIComponent(String(pick.id)), { replace: true })');
  });
  it("the Delete account dialog sits outside the tab sections", () => {
    expect(page.indexOf("{deleteStep > 0 && (")).toBeGreaterThan(page.indexOf('data-cmp-tab="settings"'));
  });
  it("the tab bar is not hidden while typing", () => {
    expect(cmp).not.toContain('classList.toggle("kb-open"');
  });
});

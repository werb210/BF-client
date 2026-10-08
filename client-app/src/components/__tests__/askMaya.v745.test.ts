// BF_CLIENT_ASK_MAYA_v745
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const widget = readFileSync("src/components/MayaWidget.tsx", "utf8");
const portal = readFileSync("src/pages/MiniPortalPage.tsx", "utf8");

describe("Ask Maya on the client portal", () => {
  it("What's Next has an Ask Maya button that opens Maya", () => {
    expect(portal).toContain('data-testid="ask-maya"');
    expect(portal).toContain('new CustomEvent("maya:open", { detail: { mode: "chat" } })');
  });
  it("Maya is mounted on the portal (only the floating bubble is hidden there)", () => {
    expect(widget).not.toMatch(/startsWith\("\/application\/"\)\) return null/);
    expect(widget).toContain('const hideLauncher = location.pathname === "/portal" || location.pathname.startsWith("/application/");');
    expect(widget).toContain("{!hideLauncher && (<>");
  });
});

// BF_CLIENT_BEHAVIOUR_v707 / BF_CLIENT_READABILITY_v707
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { wizardStepFromPath } from "../lib/clientBehaviour";
import { tokens } from "../styles/tokens";

describe("client behaviour tracking", () => {
  const src = readFileSync("src/lib/clientBehaviour.ts", "utf8");
  it("reads the wizard step from the route", () => {
    expect(wizardStepFromPath("/apply/step-3")).toBe("3");
    expect(wizardStepFromPath("/portal")).toBe("");
  });
  it("records clicks, completed fields and the field someone stopped on", () => {
    for (const t of ['"click"', '"field_complete"', '"field_abandon"']) expect(src).toContain(t);
  });
  it("never reads what an applicant types", () => {
    expect(src).not.toMatch(/\.value\b/);
  });
  it("starts at boot and follows every route", () => {
    expect(readFileSync("src/main.tsx", "utf8")).toContain("initClientBehaviour();");
    expect(readFileSync("src/components/RouteTracker.tsx", "utf8")).toContain("clientBehaviourRoute(location.pathname)");
  });
});

function lum(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

describe("readability", () => {
  it("gold text is readable on white and the page background", () => {
    expect(ratio(tokens.colors.accentInk, "#FFFFFF")).toBeGreaterThanOrEqual(4.5);
    expect(ratio(tokens.colors.accentInk, "#F5F8FC")).toBeGreaterThanOrEqual(4.5);
    expect(readFileSync("src/styles/components.ts", "utf8")).toContain("color: tokens.colors.accentInk");
  });
  it("disabled button label and Call us button are readable", () => {
    expect(ratio("#334155", "#CBD5E1")).toBeGreaterThanOrEqual(4.5);
    expect(ratio("#FFFFFF", "#15803D")).toBeGreaterThanOrEqual(4.5);
    expect(readFileSync("src/components/CallUsButton.tsx", "utf8")).toContain('background: "#15803d"');
  });
});

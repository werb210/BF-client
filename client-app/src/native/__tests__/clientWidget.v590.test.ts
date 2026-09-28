// BF_CLIENT_BLOCK_v590_HOME_WIDGET
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { widgetPayload } from "../clientWidget";

describe("home-screen widget payload", () => {
  it("keeps only real values and caps the count", () => {
    expect(widgetPayload({ applicationId: " a1 ", stage: "in_review", todo: "3", business: "Acme" }))
      .toEqual({ applicationId: "a1", stage: "in_review", todo: 3, business: "Acme" });
    expect(widgetPayload({ todo: 250 })).toEqual({ todo: 99 });
    expect(widgetPayload({ todo: -2 })).toEqual({ todo: 0 });
    expect(widgetPayload({ stage: "", business: "undefined", todo: "x" })).toEqual({});
  });
  it("is fed by the portal (stage), the action centre (count) and cleared on sign-out", () => {
    expect(readFileSync("src/components/ActionCenter.tsx", "utf8")).toContain("updateClientWidget({ applicationId, todo: allOutstanding.length, action: m.actionLine(allOutstanding) })"); // BF_CLIENT_TODO_ACTIONS_v637 - includes signing
    expect(readFileSync("src/pages/MiniPortalPage.tsx", "utf8")).toContain("updateClientWidget({ applicationId, stage:");
    expect(readFileSync("src/auth/token.ts", "utf8")).toContain("clearClientWidget()");
  });
  it("has a widget extension target embedded in the app, sharing one app group", () => {
    const pbx = readFileSync("ios/App/App.xcodeproj/project.pbxproj", "utf8");
    expect(pbx).toContain("com.boreal.client.widget");
    expect(pbx).toContain("ClientWidget.appex in Embed Foundation Extensions");
    expect(pbx.match(/CODE_SIGN_ENTITLEMENTS = App\/App.entitlements;/g)?.length).toBe(2);
    const swift = readFileSync("ios/App/ClientWidget/ClientWidget.swift", "utf8");
    expect(swift).toContain("containerBackground(borealNavy, for: .widget)"); // BF_CLIENT_WIDGET_BRAND_v631
    expect(swift).toContain("group.com.boreal.client");
    expect(readFileSync("ios/App/App/AppDelegate.swift", "utf8")).toContain("group.com.boreal.client");
    expect(readFileSync("ios/App/App/BorealBridgeViewController.swift", "utf8")).toContain("ClientWidgetPlugin()");
  });
});

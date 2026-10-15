// BF_CLIENT_v812_COMPANY_BUNDLE_ID - the iPhone app ships from the company Apple account (team 76VAY7UJKJ) as
// com.borealfinancial.client; com.boreal.client belongs to another Apple account. The widget, share extension and
// app group follow the new ID. Android keeps com.boreal.client.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const pbx = readFileSync("ios/App/App.xcodeproj/project.pbxproj", "utf8");

describe("iPhone app uses the company bundle ID and team", () => {
  it("every target uses the company team", () => {
    expect(pbx).not.toContain("547H2X5ZG3");
    expect((pbx.match(/DEVELOPMENT_TEAM = 76VAY7UJKJ;/g) ?? []).length).toBeGreaterThanOrEqual(6);
  });
  it("app, widget and share extension use com.borealfinancial.client", () => {
    expect(pbx).toMatch(/PRODUCT_BUNDLE_IDENTIFIER = com\.borealfinancial\.client;/);
    expect(pbx).toContain("PRODUCT_BUNDLE_IDENTIFIER = com.borealfinancial.client.widget;");
    expect(pbx).toContain("PRODUCT_BUNDLE_IDENTIFIER = com.borealfinancial.client.share;");
    expect(pbx).not.toMatch(/PRODUCT_BUNDLE_IDENTIFIER = com\.boreal\.client[;.]/);
  });
  it("all three entitlements share the new app group", () => {
    for (const f of ["ios/App/App/App.entitlements", "ios/App/BorealShare/BorealShare.entitlements", "ios/App/ClientWidget/ClientWidget.entitlements"]) {
      const s = readFileSync(f, "utf8");
      expect(s, f).toContain("<string>group.com.borealfinancial.client</string>");
      expect(s, f).not.toContain("group.com.boreal.client<");
    }
  });
  it("Android keeps com.boreal.client", () => {
    expect(readFileSync("android/app/build.gradle", "utf8")).toContain('applicationId "com.boreal.client"');
  });
});

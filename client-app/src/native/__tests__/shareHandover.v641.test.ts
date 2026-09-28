// BOREAL_SHARE_EXTENSION_v640 - the app picks up what the share extension saved.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const IOS = "ios/App";
const GROUP = "group.com.boreal.client";
const read = (p: string) => readFileSync(IOS + "/" + p, "utf8");

describe("share extension hand-over", () => {
  it("the app hands shared files to its shared-file screen", () => {
    expect(read("BorealShare/BorealShare.entitlements")).toContain(GROUP);
    expect(read("App/App.entitlements")).toContain(GROUP);
    expect(read("BorealShare/ShareViewController.swift")).toContain('appGroup = "' + GROUP + '"');
    const app = read("App/AppDelegate.swift");
    expect(app).toContain('forSecurityApplicationGroupIdentifier: "' + GROUP + '"');
    expect(app).toContain("func sceneDidBecomeActive(_ scene: UIScene) { SharedInboxDelivery.deliver() }");
    expect(app).toContain("ApplicationDelegateProxy.shared.application(UIApplication.shared, open: url, options: [:])");
  });
});

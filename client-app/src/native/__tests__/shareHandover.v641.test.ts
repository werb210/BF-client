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
    expect(app).toContain("SharedInboxDelivery.deliver() // BOREAL_SHARE_EXTENSION_v640"); // BF_CLIENT_SCENE_PRIVACY_v675 - now inside a multi-line sceneDidBecomeActive
    expect(app).toContain("func sceneWillResignActive(_ scene: UIScene) { PrivacyCover.show(on: window");
    expect(app).toContain("ApplicationDelegateProxy.shared.application(UIApplication.shared, open: url, options: [:])");
  });
});

// BF_CLIENT_v817 - universal links / app links: the association files and how the Static Web App serves them.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../..");
const json = (rel: string) => JSON.parse(readFileSync(resolve(root, rel), "utf8"));

describe("app link association", () => {
  it("apple-app-site-association names the new and old iOS app ids", () => {
    const aasa = json("public/.well-known/apple-app-site-association");
    const ids = aasa.applinks.details.flatMap((d: { appIDs?: string[]; appID?: string }) => d.appIDs ?? [d.appID]);
    expect(ids).toContain("76VAY7UJKJ.com.borealfinancial.client");
    expect(ids).toContain("547H2X5ZG3.com.boreal.client");
  });

  it("assetlinks.json names the Android package", () => {
    const links = json("public/.well-known/assetlinks.json");
    expect(links[0].target.package_name).toBe("com.boreal.client");
    expect(links[0].relation).toContain("delegate_permission/common.handle_all_urls");
  });

  it("the Static Web App serves both as JSON and never rewrites them to index.html", () => {
    const swa = json("public/staticwebapp.config.json");
    for (const route of ["/.well-known/apple-app-site-association", "/.well-known/assetlinks.json"]) {
      const r = swa.routes.find((x: { route: string }) => x.route === route);
      expect(r?.headers?.["Content-Type"]).toBe("application/json");
    }
    expect(swa.navigationFallback.exclude).toContain("/.well-known/*");
  });

  it("the iOS app claims client.boreal.financial", () => {
    expect(readFileSync(resolve(root, "ios/App/App/App.entitlements"), "utf8")).toContain("applinks:client.boreal.financial");
  });
});

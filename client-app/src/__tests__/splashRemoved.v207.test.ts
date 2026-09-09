// BF_CLIENT_SPLASH_REMOVE_v1
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import config from "../../capacitor.config";

const root = path.resolve(__dirname, "../..");
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8");

// BF_CLIENT_SPLASH_REMOVE_v2
// v1 copied two assertions from BI-Client that read
// the generated native Capacitor config. BI-Client commits that file; this repo
// gitignores it and regenerates it with `cap sync` at build time, so the reads
// failed with ENOENT on a repo where the removal had in fact worked. The
// generated-config check belongs only where the file is under version control.
describe("splash-screen plugin is removed", () => {
  it("is not a dependency", () => {
    // SplashScreenPlugin.load() reads bridge?.viewController?.view, which
    // builds a new CapacitorBridge, which loads the plugin again. No config
    // value breaks that: showOnLaunch() calls buildViews() before it checks
    // launchShowDuration.
    const pkg = JSON.parse(read("package.json"));
    expect(pkg.dependencies?.["@capacitor/splash-screen"]).toBeUndefined();
  });

  it("is not imported by any source file", () => {
    const walk = (dir: string): string[] =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const full = path.join(dir, e.name);
        return e.isDirectory() ? walk(full) : /\.tsx?$/.test(e.name) ? [full] : [];
      });
    const splashPackage = ["@capacitor", "splash-screen"].join("/");
    const splashImport = new RegExp(`from\\s+["']${splashPackage}["']`);
    const offenders = walk(path.join(root, "src"))
      .filter((f) => splashImport.test(fs.readFileSync(f, "utf8")))
      .map((f) => path.relative(root, f));
    expect(offenders).toEqual([]);
  });

  it("is absent from the Capacitor config", () => {
    expect(config.plugins?.SplashScreen).toBeUndefined();
  });
});

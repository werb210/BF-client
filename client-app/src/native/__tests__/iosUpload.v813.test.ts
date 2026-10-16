// BF_CLIENT_v813_IOS_UPLOAD - the cloud upload workflow: manual only, company team, released Xcode, secrets never
// written into the repo, a build number Apple has not seen, and export settings that upload to App Store Connect.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const wf = readFileSync("../.github/workflows/ios-upload.yml", "utf8");
const plist = readFileSync("ios/App/ci/ExportOptions.plist", "utf8");

describe("Upload iOS build workflow", () => {
  it("only runs when started by hand", () => {
    const on = wf.slice(wf.indexOf("\non:"), wf.indexOf("\nconcurrency:"));
    expect(on).toContain("workflow_dispatch:");
    expect(on).not.toMatch(/\bpush:|\bpull_request:|\bschedule:/);
  });
  it("uses the released Xcode, not a beta", () => {
    expect(wf).toContain("xcode-version: latest-stable");
  });
  it("signs with the company team and uploads with the App Store Connect key from secrets", () => {
    expect(wf).toContain("DEVELOPMENT_TEAM=76VAY7UJKJ");
    for (const s of ["ASC_KEY_ID", "ASC_ISSUER_ID", "ASC_KEY_P8"]) expect(wf).toContain(`secrets.${s}`);
    expect(wf).toContain("-allowProvisioningUpdates");
    expect(wf).not.toMatch(/BEGIN PRIVATE KEY/);
    expect(wf).toMatch(/if: always\(\)\s+run: rm -rf "\$RUNNER_TEMP\/asc"/);
  });
  it("gives every run a new build number for all targets", () => {
    expect(wf).toContain('echo "BUILD_NUMBER=$((1000 + GITHUB_RUN_NUMBER))" >> "$GITHUB_ENV"');
    expect(wf).toContain('CURRENT_PROJECT_VERSION="$BUILD_NUMBER"');
  });
  it("export settings upload to App Store Connect for the company team", () => {
    expect(plist).toMatch(/<key>method<\/key>\s*<string>app-store-connect<\/string>/);
    expect(plist).toMatch(/<key>destination<\/key>\s*<string>upload<\/string>/);
    expect(plist).toMatch(/<key>teamID<\/key>\s*<string>76VAY7UJKJ<\/string>/);
  });
});

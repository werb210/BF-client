// BF_CLIENT_ANDROID_FCM_v1
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const appGradle = readFileSync("android/app/build.gradle", "utf8");
const projectGradle = readFileSync("android/build.gradle", "utf8");

describe("BF_CLIENT_ANDROID_FCM_v1", () => {
  it("applies the google-services plugin on the app module", () => {
    expect(appGradle).toContain("com.google.gms.google-services");
  });

  it("declares the google-services classpath on the project", () => {
    expect(projectGradle).toContain("com.google.gms:google-services");
  });

  it("carries the sentinel so the block is idempotent", () => {
    expect(appGradle).toContain("BF_CLIENT_ANDROID_FCM_v1");
  });
});

// BF_ROUTER_EXPLICIT_STEPS_v41 — Block 41-B
// Pin the OTP-kickback regression. matchPath against the partial-segment
// pattern returns null in react-router v7; the explicit per-step paths must
// match. If anyone re-introduces "step-:stepNumber" this test fails red.
import { describe, it, expect } from "vitest";
import { matchPath } from "react-router-dom";

describe("AppRouter step routes", () => {
  it("partial-segment 'step-:stepNumber' does NOT match in v7 (regression pin)", () => {
    expect(matchPath("/apply/step-:stepNumber", "/apply/step-1")).toBeNull();
  });

  it.each([1, 2, 3, 4, 5, 6])("explicit route /apply/step-%i matches", (n) => {
    expect(matchPath(`/apply/step-${n}`, `/apply/step-${n}`)).not.toBeNull();
  });
});

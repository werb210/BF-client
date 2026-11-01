import { describe, expect, it } from "vitest";
import { STEP5_STACK_BREAKPOINT_PX, STEP5_STACK_CSS } from "../step5Stack";

describe("v863 Step 5 options on phones", () => {
  it("switches to one column at the phone breakpoint, by container and by viewport", () => {
    expect(STEP5_STACK_BREAKPOINT_PX).toBe(700);
    expect(STEP5_STACK_CSS).toContain("@container (max-width: 700px)");
    expect(STEP5_STACK_CSS).toContain("@media (max-width: 700px)");
    expect(STEP5_STACK_CSS).toContain("container-type: inline-size");
  });
  it("makes each option full width and centres the OR between them", () => {
    const rules = STEP5_STACK_CSS.split("@media")[1];
    expect(rules).toContain(".step5-options-row { flex-direction: column !important; align-items: center !important; }");
    expect(rules).toContain("width: 100% !important; max-width: 420px !important;");
    expect(rules).toContain(".step5-or { width: 100%;");
  });
});

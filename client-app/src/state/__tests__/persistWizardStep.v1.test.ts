// BF_CLIENT_PERSIST_WIZARD_STEP_v1
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const src = readFileSync(
  path.join(process.cwd(), "src/state/useApplicationStore.ts"),
  "utf8",
);

describe("wizard step reaches the server", () => {
  it("pings the server when the step changes", () => {
    expect(src).toContain("function _persistStepToServer");
    expect(src).toContain("_persistStepToServer(s, next.applicationToken)");
  });

  it("sends the field name the server actually accepts", () => {
    // patchSchema takes currentStep (1-6); snake_case current_step is legacy.
    expect(src).toContain("{ currentStep: step }");
  });

  it("does nothing before an application row exists", () => {
    expect(src).toContain("if (!token) return;");
  });

  it("does not re-ping the same step", () => {
    expect(src).toContain("if (_lastPersistedStep === step) return;");
  });

  it("lets a failed ping be retried on a later transition", () => {
    expect(src).toContain("if (_lastPersistedStep === step) _lastPersistedStep = undefined;");
  });

  it("never blocks navigation on a failed ping", () => {
    // Losing a data point is acceptable; blocking the wizard is not.
    expect(src).toContain("void import(\"../client/autosave\")");
    expect(src).toContain(".catch(() => {");
  });

  it("resets the guard for a new application", () => {
    expect(src).toContain("_lastPersistedStep=undefined;");
  });
});

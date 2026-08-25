// BF_CLIENT_PERSIST_WIZARD_STEP_v1
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const src = readFileSync(
  path.join(process.cwd(), "src/state/useApplicationStore.ts"),
  "utf8",
);

// BF_CLIENT_FIX_PERSIST_TEST_v189
describe("the answers reach the server too", () => {
  it("sends the wizard slices alongside the step", () => {
    // Before v186 only the step number left the device. Everything the applicant
    // typed sat in localStorage until submit, so an abandoned application on the
    // server was an empty shell and a returning applicant got a blank form.
    expect(src).toContain("function _wizardPayload");
    expect(src).toContain('put("kyc"');
    expect(src).toContain('put("business"');
    expect(src).toContain('put("applicant"');
  });

  it("still sends the step if the payload cannot be built", () => {
    expect(src).toContain("payload = { currentStep: step };");
  });
});

describe("wizard step reaches the server", () => {
  it("pings the server when the step changes", () => {
    // BF_CLIENT_FIX_PERSIST_TEST_v189 - this pinned the exact call signature,
    // so adding the wizard payload as a third argument in v186 broke it even
    // though the behaviour it guards was intact. Assert the token still reaches
    // the persist call, without freezing the arity.
    expect(src).toContain("function _persistStepToServer");
    expect(src).toContain("_persistStepToServer(s, next.applicationToken");
  });

  it("sends the field name the server actually accepts", () => {
    // patchSchema takes currentStep (1-6); snake_case current_step is legacy.
    // BF_CLIENT_FIX_PERSIST_TEST_v189 - currentStep is now the base of a payload
    // that also carries kyc/business/applicant, so the literal object no longer
    // appears verbatim. The field name is what matters and is still asserted.
    expect(src).toContain("currentStep: step");
    expect(src).not.toContain("current_step: step");
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

// BF_CLIENT_STEP_PERSIST_v183 - applications.current_step was 1 for all 63
// rows in the database, including the 8 submitted ones, because nothing ever
// wrote it to the server.
import { describe, it, expect } from "vitest";
import fs from "fs";

const SRC = fs.readFileSync("src/wizard/Wizard.tsx", "utf8");

describe("the step reaches the server", () => {
  it("sends current_step on every step change", () => {
    expect(SRC).toContain("ClientAppAPI.update(token, { current_step: stepFromUrl })");
  });

  it("falls back to the offline token, as the rest of the wizard does", () => {
    expect(SRC).toContain("OfflineStore.load()");
    expect(SRC).toContain("app.applicationToken");
  });

  it("does nothing before an application exists", () => {
    expect(SRC).toContain("if (!token) return;");
  });
});

describe("it never blocks the wizard", () => {
  it("is fire-and-forget", () => {
    expect(SRC).toContain("void ClientAppAPI.update");
    expect(SRC).toContain('console.warn("[wizard] current_step persist failed"');
  });

  it("retries on the next transition after a failure", () => {
    expect(SRC).toContain("lastPersistedStep.current = null;");
  });

  it("does not re-send the same step on unrelated re-renders", () => {
    expect(SRC).toContain("if (lastPersistedStep.current === stepFromUrl) return;");
  });
});

describe("the local store still works as before", () => {
  it("keeps the existing update call", () => {
    expect(SRC).toContain("update({ currentStep: stepFromUrl });");
  });
});

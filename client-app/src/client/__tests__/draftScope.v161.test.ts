// BF_CLIENT_DRAFT_SCOPED_v161
import { describe, it, expect, beforeEach } from "vitest";
import {
  saveStepData, loadStepData, currentDraftScope, adoptAnonDrafts,
  purgeLegacyDrafts, ANON_DRAFT_SCOPE,
} from "../autosave";

class Mem implements Storage {
  private m = new Map<string, string>();
  get length() { return this.m.size; }
  clear() { this.m.clear(); }
  getItem(k: string) { return this.m.get(k) ?? null; }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
  removeItem(k: string) { this.m.delete(k); }
  setItem(k: string, v: string) { this.m.set(k, v); }
  [name: string]: any;
}

let local: Mem;
beforeEach(() => { local = new Mem(); sessionStorage.clear(); });
const scopeFor = (phone: string) => {
  sessionStorage.setItem("verified_phone", phone);
  return currentDraftScope();
};

describe("the reported case", () => {
  it("a different phone on the same browser sees nothing", () => {
    const andrew = scopeFor("+15875551234");
    saveStepData(1, { firstName: "Andrew", ssn: "111-11-1111" }, local);
    const brother = scopeFor("+15875559999");
    expect(brother).not.toBe(andrew);
    expect(loadStepData(1, local)).toBeNull();
  });
  it("keeps the original draft for its owner", () => {
    scopeFor("+15875551234");
    saveStepData(1, { firstName: "Andrew" }, local);
    scopeFor("+15875559999");
    expect(loadStepData(1, local)).toBeNull();
    scopeFor("+15875551234");
    expect(loadStepData(1, local)).toEqual({ firstName: "Andrew" });
  });
});

describe("scope normalization", () => {
  it("resolves formatting differences to one scope", () => {
    expect(scopeFor("+1 (587) 555-1234")).toBe(scopeFor("5875551234"));
    expect(scopeFor("+15875551234")).toBe(scopeFor("587-555-1234"));
  });
  it("does not collide different numbers", () => {
    expect(scopeFor("+15875551234")).not.toBe(scopeFor("+15875551235"));
  });
});

describe("before OTP", () => {
  it("uses the anonymous scope", () => {
    expect(currentDraftScope()).toBe(ANON_DRAFT_SCOPE);
  });
  it("adopts the anonymous draft after verification", () => {
    saveStepData(1, { firstName: "Typed before login" }, local);
    adoptAnonDrafts(scopeFor("+15875551234"), local);
    expect(loadStepData(1, local)).toEqual({ firstName: "Typed before login" });
  });
  it("never overwrites a phone draft with an anonymous one", () => {
    const scope = scopeFor("+15875551234");
    saveStepData(1, { firstName: "Real" }, local);
    sessionStorage.removeItem("verified_phone");
    saveStepData(1, { firstName: "Stale anon" }, local);
    adoptAnonDrafts(scope, local);
    scopeFor("+15875551234");
    expect(loadStepData(1, local)).toEqual({ firstName: "Real" });
  });
  it("clears the anonymous copy after adoption", () => {
    saveStepData(1, { a: 1 }, local);
    adoptAnonDrafts(scopeFor("+15875551234"), local);
    sessionStorage.removeItem("verified_phone");
    expect(loadStepData(1, local)).toBeNull();
  });
});

describe("legacy and wiring", () => {
  it("purges drafts from before v161", () => {
    local.setItem("client:draft:step:1", JSON.stringify({ ssn: "111-11-1111" }));
    purgeLegacyDrafts(local);
    expect(local.getItem("client:draft:step:1")).toBeNull();
  });
  it("triggers purge and adoption from OTP", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const otp = readFileSync(resolve(__dirname, "..", "..", "pages", "OtpPage.tsx"), "utf-8");
    expect(otp).toContain("purgeLegacyDrafts()");
    expect(otp).toContain("adoptAnonDrafts(currentDraftScope())");
  });
});

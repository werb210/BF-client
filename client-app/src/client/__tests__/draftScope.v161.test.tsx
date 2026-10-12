// BF_CLIENT_DRAFT_SCOPED_v161
import { describe, it, expect, beforeEach, vi } from "vitest";
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const navigateMock = vi.hoisted(() => vi.fn());
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});
vi.mock("@/components/QuickSignIn", () => ({ default: (): null => null }));

import PhoneOTPInline from "@/components/PhoneOTPInline";
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

describe("legacy drafts", () => {
  it("purges drafts from before v161", () => {
    local.setItem("client:draft:step:1", JSON.stringify({ ssn: "111-11-1111" }));
    purgeLegacyDrafts(local);
    expect(local.getItem("client:draft:step:1")).toBeNull();
  });
});

describe("signing in with a text code", () => {
  it("drops the pre-v161 drafts and adopts what was typed before signing in", async () => {
    localStorage.clear();
    navigateMock.mockReset();
    localStorage.setItem("client:draft:step:1", JSON.stringify({ firstName: "Someone else" }));
    saveStepData(1, { firstName: "Typed before login" });
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        const u = String(url);
        if (u.endsWith("/api/auth/otp/start")) return new Response("{}", { status: 200 });
        if (u.endsWith("/api/auth/otp/verify")) {
          return new Response(JSON.stringify({ token: "jwt", hasSubmittedApplication: true, submittedApplicationId: "app-1" }), { status: 200 });
        }
        return new Response("{}", { status: 404 });
      }),
    );
    try {
      const view = render(
        <MemoryRouter>
          <PhoneOTPInline />
        </MemoryRouter>,
      );
      fireEvent.change(view.container.querySelector('input[type="tel"]') as HTMLInputElement, { target: { value: "5875551234" } });
      const code = await waitFor(() => {
        const el = view.container.querySelector('input[name="otp"]');
        expect(el).toBeTruthy();
        return el as HTMLInputElement;
      });
      await act(async () => {
        fireEvent.change(code, { target: { value: "123456" } });
      });
      await waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/application/app-1"));

      expect(sessionStorage.getItem("verified_phone")).toBe("+15875551234");
      expect(localStorage.getItem("client:draft:step:1")).toBeNull();
      expect(localStorage.getItem(`client:draft:step:${ANON_DRAFT_SCOPE}:1`)).toBeNull();
      expect(currentDraftScope()).toBe("5875551234");
      expect(loadStepData(1)).toEqual({ firstName: "Typed before login" });
    } finally {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    }
  });
});

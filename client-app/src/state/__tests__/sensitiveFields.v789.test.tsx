// BF_CLIENT_v789_SENSITIVE_FIELDS - a SIN/SSN, date of birth, home street
// address or personal financial figure never reaches device storage; after a
// successful submit no application data is left in storage at all.
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/api/auth", () => ({ hasToken: () => false }));
vi.mock("../../client/autosave", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../client/autosave")>();
  return { ...actual, patchApplication: vi.fn(async () => ({})) };
});

import { stripSensitive, SENSITIVE_KEYS } from "../sensitiveFields";
import { OfflineStore } from "../offline";
import { PENDING_SUBMIT_KEY, readPendingSubmit, savePendingSubmit } from "../pendingSubmit";
import { loadStepData, saveStepData } from "../../client/autosave";
import {
  __resetSingletonForTests,
  clearStoredApplication,
  useApplicationStore,
} from "../useApplicationStore";
import type { ApplicationData } from "@/types/application";

const SIN = "046 454 286";
const DOB = "1985-04-02";
const HOME = "1 Home St";

function everythingStored(): string {
  const parts: string[] = [];
  for (const storage of [localStorage, sessionStorage]) {
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (key) parts.push(`${key}=${storage.getItem(key)}`);
    }
  }
  return parts.join("\n");
}

type Store = ReturnType<typeof useApplicationStore>;

function mountStore(): { store: () => Store; unmount: () => void } {
  let current: Store | null = null;
  function Probe(): null {
    current = useApplicationStore();
    return null;
  }
  const root = createRoot(document.createElement("div"));
  act(() => root.render(<Probe />));
  return { store: () => current as Store, unmount: () => act(() => root.unmount()) };
}

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  sessionStorage.clear();
  OfflineStore.clear();
  __resetSingletonForTests();
});

describe("stripSensitive", () => {
  it("lists the identifiers, birth details and personal figures", () => {
    for (const key of ["sin", "ssn", "dob", "dateOfBirth", "netWorth", "income", "alienRegistrationNumber"]) {
      expect(SENSITIVE_KEYS).toContain(key);
    }
  });

  it("removes them at any depth, and the home address only on a person", () => {
    const out = stripSensitive({
      applicant: {
        firstName: "Taylor",
        ssn: SIN,
        dob: DOB,
        street: HOME,
        city: "Calgary",
        partner: { ssn: "123-45-6789", street: "2 Other Rd", firstName: "Sam" },
        additionalShareholders: [{ name: "Lee", address: "3 Third Ave", ownership: "10" }],
      },
      business: { address: "100 Business Way", street: "100 Business Way" },
      kyc: { netWorth: "1000000", fundingAmount: "$100,000" },
    });
    expect(out).toEqual({
      applicant: {
        firstName: "Taylor",
        city: "Calgary",
        partner: { firstName: "Sam" },
        additionalShareholders: [{ name: "Lee", ownership: "10" }],
      },
      business: { address: "100 Business Way", street: "100 Business Way" },
      kyc: { fundingAmount: "$100,000" },
    });
  });
});

describe("the application store", () => {
  it("keeps a SIN in memory but never writes it to localStorage", () => {
    const { store, unmount } = mountStore();
    act(() =>
      store().update({
        applicant: { firstName: "Taylor", ssn: SIN, sin: SIN, dob: DOB, street: HOME, city: "Calgary" },
        kyc: { fundingAmount: "$100,000" },
      })
    );
    expect(store().app.applicant.ssn).toBe(SIN);
    expect(store().app.applicant.street).toBe(HOME);

    const stored = everythingStored();
    expect(stored).toContain("Taylor");
    expect(stored).toContain("Calgary");
    expect(stored).not.toContain(SIN);
    expect(stored).not.toContain("046454286");
    expect(stored).not.toContain(DOB);
    expect(stored).not.toContain(HOME);
    unmount();
  });

  it("purges sensitive fields left in storage by an older build when it loads", () => {
    const legacy = { applicant: { firstName: "Taylor", ssn: SIN, dob: DOB, street: HOME }, kyc: {} };
    localStorage.setItem("application_state", JSON.stringify(legacy));
    localStorage.setItem("client_backup", JSON.stringify(legacy));
    localStorage.setItem("boreal_app_cache", JSON.stringify(legacy));
    __resetSingletonForTests();
    expect(OfflineStore.load()).not.toBeNull();
    const stored = everythingStored();
    expect(stored).toContain("Taylor");
    expect(stored).not.toContain(SIN);
    expect(stored).not.toContain(DOB);
    expect(stored).not.toContain(HOME);
  });

  it("leaves no application data in storage after a successful submit", () => {
    const { store, unmount } = mountStore();
    act(() => store().update({ applicant: { firstName: "Taylor", ssn: SIN }, kyc: { fundingAmount: "$5" } }));
    saveStepData(1, { fundingAmount: "$5" });
    localStorage.setItem("client:draft:step:anon:3", JSON.stringify({ businessName: "Acme" }));
    savePendingSubmit("11111111-1111-4111-8111-111111111111", { app: { applicant: { firstName: "Taylor" } }, normalized: {} });
    expect(localStorage.getItem("application_state")).not.toBeNull();

    act(() => clearStoredApplication());

    for (const key of ["application_state", "client_backup", "boreal_app_cache", PENDING_SUBMIT_KEY]) {
      expect(localStorage.getItem(key)).toBeNull();
    }
    for (let i = 0; i < localStorage.length; i += 1) {
      expect(localStorage.key(i)).not.toMatch(/^client:draft:/);
    }
    expect(readPendingSubmit()).toBeNull();
    // Post-submit state updates (the confirmation screen) do not write it back.
    act(() => store().update({ documentReviewComplete: true }));
    expect(localStorage.getItem("application_state")).toBeNull();
    expect(everythingStored()).not.toContain("Taylor");
    unmount();
  });
});

describe("other stores", () => {
  it("the offline cache stores the copy without sensitive fields", () => {
    OfflineStore.save({ applicant: { ssn: SIN, firstName: "Taylor" } } as Partial<ApplicationData>);
    expect(localStorage.getItem("boreal_app_cache")).not.toContain(SIN);
    expect(OfflineStore.load()).toEqual({ applicant: { firstName: "Taylor" } });
  });

  it("the pending-submit outbox stores a stripped copy and keeps the full body in memory", () => {
    savePendingSubmit("tok", { app: { applicant: { ssn: SIN, dob: DOB, firstName: "Taylor" } }, normalized: {} });
    expect(localStorage.getItem(PENDING_SUBMIT_KEY)).not.toContain(SIN);
    expect(localStorage.getItem(PENDING_SUBMIT_KEY)).not.toContain(DOB);
    const entry = readPendingSubmit();
    expect((entry?.body.app.applicant as Record<string, unknown>).ssn).toBe(SIN);
  });

  it("a Step 4 draft never holds the SIN, birth date or home street", () => {
    saveStepData(4, { firstName: "Taylor", ssn: SIN, dob: DOB, street: HOME, city: "Calgary" });
    const stored = everythingStored();
    expect(stored).not.toContain(SIN);
    expect(stored).not.toContain(DOB);
    expect(stored).not.toContain(HOME);
    expect(loadStepData(4)).toEqual({ firstName: "Taylor", city: "Calgary" });
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getSessionId,
  getClientAttribution,
  getLeadFingerprint,
} from "@/utils/analytics";
import { getPersistedAttribution } from "@/utils/attribution";

// BF_CLIENT_BLOCK_v865 — Reproduces the Wayne Beamish (Powerhouse) submit
// failure: a corporate/private browser where localStorage access THROWS. The
// pre-POST analytics chain must degrade gracefully and never throw.
describe("BF_CLIENT_BLOCK_v865 — analytics survive blocked localStorage", () => {
  const throwingStorage = {
    getItem: () => {
      throw new Error("localStorage access is denied");
    },
    setItem: () => {
      throw new Error("localStorage access is denied");
    },
    removeItem: () => {
      throw new Error("localStorage access is denied");
    },
    clear: () => {
      throw new Error("localStorage access is denied");
    },
    key: () => {
      throw new Error("localStorage access is denied");
    },
    length: 0,
  };

  beforeEach(() => {
    vi.stubGlobal("localStorage", throwingStorage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("getSessionId returns a stable non-empty id instead of throwing", () => {
    let id = "";
    expect(() => {
      id = getSessionId();
    }).not.toThrow();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
    expect(getSessionId()).toBe(id);
  });

  it("getPersistedAttribution returns a null-filled object instead of throwing", () => {
    let attr: any;
    expect(() => {
      attr = getPersistedAttribution();
    }).not.toThrow();
    expect(attr).toBeTypeOf("object");
    expect(attr.utm_source).toBeNull();
    expect(attr.gclid).toBeNull();
  });

  it("getClientAttribution does not throw", () => {
    expect(() => getClientAttribution()).not.toThrow();
  });

  it("getLeadFingerprint does not throw and still yields a session_id", () => {
    let fp: any;
    expect(() => {
      fp = getLeadFingerprint();
    }).not.toThrow();
    expect(fp.session_id).toBeTruthy();
  });
});

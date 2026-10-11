// BF_CLIENT_APPLICATION_TOKEN_SECURE_v423
// bf_application_token is a bearer credential for a whole loan application. On
// the phone it belongs in the Keychain slot the session token already uses
// (SecureCredentials, keyed), never in localStorage (UserDefaults, unencrypted,
// copied into device backups). On the web it stays in localStorage.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const h = vi.hoisted(() => {
  const slots = new Map<string, string>();
  const keychain = {
    slots,
    set: vi.fn(async ({ key, value }: { key?: string; value: string }) => {
      await new Promise((r) => setTimeout(r, 0));
      slots.set(key ?? "token", value);
    }),
    get: vi.fn(async ({ key }: { key?: string } = {}) => ({ value: slots.get(key ?? "token") ?? null })),
    clear: vi.fn(async ({ key }: { key?: string } = {}) => {
      slots.delete(key ?? "token");
    }),
  };
  return { native: false, keychain };
});

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: () => h.native,
    getPlatform: () => (h.native ? "ios" : "web"),
    isPluginAvailable: () => false,
  },
  registerPlugin: (name: string) => (name === "SecureCredentials" ? h.keychain : {}),
}));

const navigateMock = vi.hoisted(() => vi.fn());
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});
vi.mock("@/components/QuickSignIn", () => ({ default: () => null }));

import {
  APPLICATION_TOKEN_KEY,
  clearApplicationToken,
  flushApplicationTokenWrites,
  getApplicationToken,
  hydrateApplicationToken,
  setApplicationToken,
} from "../applicationToken";
import PhoneOTPInline from "@/components/PhoneOTPInline";

beforeEach(async () => {
  h.native = false;
  clearApplicationToken();
  await flushApplicationTokenWrites();
  h.keychain.slots.clear();
  h.keychain.set.mockClear();
  h.keychain.clear.mockClear();
  localStorage.clear();
});

describe("v423 the application token has one owner - web", () => {
  it("round-trips on web", () => {
    setApplicationToken("abc-123");
    expect(getApplicationToken()).toBe("abc-123");
    expect(localStorage.getItem(APPLICATION_TOKEN_KEY)).toBe("abc-123");
    expect(h.keychain.set).not.toHaveBeenCalled();
  });

  it("clears completely", () => {
    setApplicationToken("abc-123");
    clearApplicationToken();
    expect(getApplicationToken()).toBeNull();
    expect(localStorage.getItem(APPLICATION_TOKEN_KEY)).toBeNull();
  });

  it("ignores an empty token instead of storing junk", () => {
    setApplicationToken("   ");
    expect(getApplicationToken()).toBeNull();
    expect(localStorage.getItem(APPLICATION_TOKEN_KEY)).toBeNull();
  });
});

describe("v423 the application token has one owner - phone", () => {
  beforeEach(() => {
    h.native = true;
  });

  it("keeps the token in the existing Keychain slot, not localStorage", async () => {
    setApplicationToken("app-9");
    expect(getApplicationToken()).toBe("app-9");
    await flushApplicationTokenWrites();
    expect(h.keychain.set).toHaveBeenCalledWith({ key: APPLICATION_TOKEN_KEY, value: "app-9" });
    expect(localStorage.getItem(APPLICATION_TOKEN_KEY)).toBeNull();
  });

  it("a clear right after a set lands after it (writes are queued in order)", async () => {
    setApplicationToken("app-9");
    clearApplicationToken();
    await flushApplicationTokenWrites();
    expect(h.keychain.slots.has(APPLICATION_TOKEN_KEY)).toBe(false);
    expect(getApplicationToken()).toBeNull();
  });

  it("hydrates from the Keychain at boot", async () => {
    clearApplicationToken();
    await flushApplicationTokenWrites();
    h.keychain.slots.set(APPLICATION_TOKEN_KEY, "from-keychain");
    expect(getApplicationToken()).toBeNull();
    await hydrateApplicationToken();
    expect(getApplicationToken()).toBe("from-keychain");
  });

  it("a slow hydrate never overwrites a token set while it was running", async () => {
    h.keychain.slots.set(APPLICATION_TOKEN_KEY, "stale");
    const hydrating = hydrateApplicationToken();
    setApplicationToken("fresh");
    await hydrating;
    await flushApplicationTokenWrites();
    expect(getApplicationToken()).toBe("fresh");
  });

  it("signing in on the phone does not write the token to localStorage", async () => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        const u = String(url);
        if (u.endsWith("/api/auth/otp/start")) return new Response("{}", { status: 200 });
        if (u.endsWith("/api/auth/otp/verify")) {
          return new Response(JSON.stringify({ token: "jwt", hasSubmittedApplication: true, submittedApplicationId: "app-77" }), { status: 200 });
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
      await waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/application/app-77"));
      await flushApplicationTokenWrites();
      expect(getApplicationToken()).toBe("app-77");
      expect(h.keychain.slots.get(APPLICATION_TOKEN_KEY)).toBe("app-77");
      expect(localStorage.getItem(APPLICATION_TOKEN_KEY)).toBeNull();
    } finally {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    }
  });
});

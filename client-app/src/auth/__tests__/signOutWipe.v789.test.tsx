/* @vitest-environment jsdom */
// BF_CLIENT_v789_SIGN_OUT_WIPE - Sign out leaves no tokens and no application
// data on the device: storage, drafts, outbox, caches and push all cleared.
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/FaceIdSignInToggle", () => ({ default: (): null => null }));
vi.mock("@/components/PasskeySignInToggle", () => ({ default: (): null => null }));
const disableDeviceSignIn = vi.fn(async () => undefined);
vi.mock("@/native/deviceSignIn", () => ({ disableDeviceSignIn }));
vi.mock("@/native/backgroundUpload", () => ({ cancelBackgroundUploads: vi.fn(async () => undefined) }));

import AccountBar from "@/components/AccountBar";
import { setToken, getToken } from "@/auth/token";
import { setApplicationToken, getApplicationToken } from "@/auth/applicationToken";
import { saveConversation, loadConversation } from "@/components/mayaConversation";
import { savePendingSubmit } from "@/state/pendingSubmit";

const postMessage = vi.fn((_msg: unknown, ports?: MessagePort[]) => {
  ports?.[0]?.postMessage({ type: "CACHES_CLEARED" });
});
const unsubscribe = vi.fn(async () => true);
const cacheNames = new Set<string>();
const deleteDatabase = vi.fn(() => {
  const request: { onsuccess?: () => void } = {};
  setTimeout(() => request.onsuccess?.(), 0);
  return request;
});

function seedSession(): void {
  setToken("jwt-session-token");
  setApplicationToken("11111111-1111-4111-8111-111111111111");
  localStorage.setItem("boreal_client_profiles", JSON.stringify({ "4035551234": { phone: "4035551234" } }));
  localStorage.setItem("application_state", JSON.stringify({ applicant: { firstName: "Taylor" } }));
  localStorage.setItem("client_backup", JSON.stringify({ applicant: { firstName: "Taylor" } }));
  localStorage.setItem("boreal_app_cache", JSON.stringify({ applicant: { firstName: "Taylor" } }));
  localStorage.setItem("client:draft:step:4035551234:3", JSON.stringify({ businessName: "Acme" }));
  localStorage.setItem("boreal_consent_v1", "granted");
  savePendingSubmit("11111111-1111-4111-8111-111111111111", { app: { applicant: { firstName: "Taylor" } }, normalized: {} });
  sessionStorage.setItem("verified_phone", "+14035551234");
  saveConversation("conv-1", "visitor-token");
  cacheNames.clear();
  ["bf-client-api", "bf-client-navigations", "workbox-precache-v2"].forEach((n) => cacheNames.add(n));
}

describe("Sign out", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    localStorage.clear();
    sessionStorage.clear();
    postMessage.mockClear();
    unsubscribe.mockClear();
    deleteDatabase.mockClear();
    disableDeviceSignIn.mockClear();
    const registration = {
      active: { postMessage },
      pushManager: { getSubscription: async () => ({ unsubscribe }) },
    };
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        controller: null,
        getRegistration: async () => registration,
        getRegistrations: async () => [registration],
      },
    });
    vi.stubGlobal("caches", {
      keys: async () => [...cacheNames],
      delete: async (name: string) => cacheNames.delete(name),
    });
    vi.stubGlobal("indexedDB", { deleteDatabase });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
    Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: undefined });
  });

  it("leaves no tokens or application data in storage", async () => {
    seedSession();
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={["/portal"]}>
          <Routes>
            <Route path="/portal" element={<AccountBar />} />
            <Route path="/otp" element={<div data-testid="landing">signed out</div>} />
          </Routes>
        </MemoryRouter>
      );
    });
    const button = Array.from(container.querySelectorAll("button")).find((b) => b.textContent === "Sign out");
    expect(button).toBeTruthy();

    await act(async () => {
      button!.click();
    });
    // Sign out waits for the whole wipe before it navigates.
    await vi.waitFor(() => expect(container.querySelector('[data-testid="landing"]')).not.toBeNull(), { timeout: 3000 });

    // Tokens.
    expect(getToken()).toBeNull();
    expect(getApplicationToken()).toBeNull();
    // Only the consent choice (a device preference) is left in localStorage.
    const keys = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i));
    expect(keys).toEqual(["boreal_consent_v1"]);
    expect(sessionStorage.length).toBe(0);
    expect(loadConversation()).toBeNull();
    // Service worker caches, the page's own cache view, outboxes and push.
    expect(postMessage).toHaveBeenCalledWith({ type: "CLEAR_CACHES" }, expect.any(Array));
    expect(cacheNames.size).toBe(0);
    expect(deleteDatabase).toHaveBeenCalledWith("bf-upload-queue");
    expect(deleteDatabase).toHaveBeenCalledWith("bf-form-response-queue");
    expect(unsubscribe).toHaveBeenCalled();
    expect(disableDeviceSignIn).toHaveBeenCalled();
    // And the person lands on the sign-in screen.
    expect(container.querySelector('[data-testid="landing"]')).not.toBeNull();
  });
});

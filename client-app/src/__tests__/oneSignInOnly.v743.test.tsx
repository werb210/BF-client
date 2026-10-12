// BF_CLIENT_ONE_SIGNIN_ONLY_v743
// The old stand-alone OTP page is gone: /otp opens the landing page, and the
// landing page's sign-in does what the old page did after a code is verified.
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const drafts = vi.hoisted(() => ({
  purgeLegacyDrafts: vi.fn(),
  adoptAnonDrafts: vi.fn(),
  currentDraftScope: vi.fn(() => "phone:+15875551234"),
}));
vi.mock("@/client/autosave", () => drafts);

function LandingStub(): JSX.Element {
  const location = useLocation();
  return <div data-testid="landing">{location.pathname + location.search}</div>;
}
vi.mock("@/pages/LandingPage", () => ({ default: LandingStub }));
vi.mock("@/wizard/Wizard", () => ({ default: () => <div>WIZARD</div> }));

import AppRouter from "@/router/AppRouter";
import PhoneOTPInline from "@/components/PhoneOTPInline";

type ClarityWindow = Window & { clarity?: (...args: unknown[]) => void };

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  drafts.purgeLegacyDrafts.mockReset();
  drafts.adoptAnonDrafts.mockReset();
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(window, "scrollTo").mockImplementation(() => undefined); // ScrollToTop; jsdom has none
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  delete (window as ClarityWindow).clarity;
});

describe("there is exactly one sign-in screen", () => {
  it("/otp leads to the landing page, keeping the query string", async () => {
    render(
      <MemoryRouter initialEntries={["/otp?next=portal"]}>
        <AppRouter />
      </MemoryRouter>
    );
    expect((await screen.findByTestId("landing")).textContent).toBe("/?next=portal");
    expect(screen.queryByText("Mobile Phone Number (E.164)")).toBeNull();
  });

  it("the one sign-in screen does what the old page did after a code is verified", async () => {
    const clarity = vi.fn();
    (window as ClarityWindow).clarity = clarity;
    const fetchMock = vi.fn(async (url: unknown) => {
      const u = String(url);
      if (u.includes("/api/auth/otp/start")) return { ok: true, status: 200, json: async () => ({ ok: true }), text: async () => "" };
      if (u.includes("/api/auth/otp/verify")) {
        return { ok: true, status: 200, json: async () => ({ token: "jwt", hasSubmittedApplication: true, submittedApplicationId: "app-1" }) };
      }
      throw new Error("unexpected fetch " + u);
    });
    vi.stubGlobal("fetch", fetchMock);

    const { container } = render(
      <MemoryRouter>
        <PhoneOTPInline />
      </MemoryRouter>
    );
    fireEvent.change(container.querySelector('input[type="tel"]') as HTMLInputElement, { target: { value: "5875551234" } });
    const codeInput = await waitFor(() => {
      const el = container.querySelector('input[name="otp"]');
      if (!el) throw new Error("code input not shown yet");
      return el as HTMLInputElement;
    });
    await act(async () => {
      fireEvent.change(codeInput, { target: { value: "123456" } });
    });
    await waitFor(() => expect(drafts.adoptAnonDrafts).toHaveBeenCalled());

    // Step 1 pre-fills and files drafts under the verified phone.
    expect(sessionStorage.getItem("verified_phone")).toBe("+15875551234");
    // Drafts typed before sign-in are adopted; the old unscoped keys are dropped.
    expect(drafts.purgeLegacyDrafts).toHaveBeenCalledTimes(1);
    expect(drafts.adoptAnonDrafts).toHaveBeenCalledWith("phone:+15875551234");
    // BF_CLIENT_v789_ANALYTICS_GATES - the phone number never goes to Clarity.
    expect(JSON.stringify(clarity.mock.calls)).not.toContain("5875551234");
  });
});

// BF_CLIENT_INLINE_OTP_CLIENT_v346
// v343 only fixed endpoints.otpVerify, so the landing page's own fetch to the
// literal verify path kept minting staff tokens for a phone that is also a staff
// user. Drive each sign-in screen and read the verify request it really sends.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const navigateMock = vi.hoisted(() => vi.fn());
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});
// Face ID / passkey buttons are not part of the text-code flow.
vi.mock("@/components/QuickSignIn", () => ({ default: () => null }));

import PhoneOTPInline from "@/components/PhoneOTPInline";
import { verifyAccountantOtp } from "../accountant";

type Call = { url: string; init: RequestInit };
let calls: Call[] = [];

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

beforeEach(() => {
  calls = [];
  navigateMock.mockReset();
  localStorage.clear();
  sessionStorage.clear();
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit = {}) => {
      calls.push({ url: String(url), init });
      const u = String(url);
      if (u.endsWith("/api/auth/otp/start")) return json({ ok: true });
      if (u.endsWith("/api/auth/otp/verify")) {
        return json({ status: "ok", data: { token: "client-jwt", hasSubmittedApplication: true, submittedApplicationId: "app-1" } });
      }
      return json({}, 404);
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const verifyCalls = () => calls.filter((c) => c.url.endsWith("/api/auth/otp/verify"));

describe("every OTP verify request names who is signing in", () => {
  it("the landing page sign-in asks for a client token", async () => {
    const view = render(
      <MemoryRouter>
        <PhoneOTPInline />
      </MemoryRouter>,
    );
    fireEvent.change(view.container.querySelector('input[type="tel"]') as HTMLInputElement, {
      target: { value: "5875551234" },
    });
    const codeInput = await waitFor(() => {
      const el = view.container.querySelector('input[name="otp"]');
      expect(el).toBeTruthy();
      return el as HTMLInputElement;
    });
    await act(async () => {
      fireEvent.change(codeInput, { target: { value: "123456" } });
    });
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/application/app-1"));

    expect(verifyCalls()).toHaveLength(1);
    expect(verifyCalls()[0].init.method).toBe("POST");
    expect(JSON.parse(String(verifyCalls()[0].init.body))).toEqual({
      phone: "+15875551234",
      code: "123456",
      userType: "client",
    });
  });

  it("the accountant portal asks for an accountant token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit = {}) => {
        calls.push({ url: String(url), init });
        return json({ data: { token: "acct-jwt", user: { name: "Pat" } } });
      }),
    );
    await expect(verifyAccountantOtp("+15875551234", "654321")).resolves.toEqual({ name: "Pat" });
    expect(verifyCalls()).toHaveLength(1);
    expect(JSON.parse(String(verifyCalls()[0].init.body))).toEqual({
      phone: "+15875551234",
      code: "654321",
      userType: "accountant",
    });
  });
});

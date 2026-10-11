// BF_CLIENT_OTP_ATTRIBUTION_v1
// The OTP sign-in's /api/public/application/start is the call that actually
// creates the application row (every applicant signs in before the wizard
// mounts), so it must carry the first-touch attribution - and attribution must
// never be able to block a login.
// The wizard's own start call is covered in otpAttribution.step1.v1.test.tsx.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

const getAttribution = vi.hoisted(() => vi.fn());
vi.mock("@/lib/attribution", () => ({ getAttribution }));
vi.mock("../QuickSignIn", () => ({ default: () => null }));
vi.mock("@/client/autosave", () => ({ adoptAnonDrafts: vi.fn(), currentDraftScope: vi.fn(), purgeLegacyDrafts: vi.fn() }));
vi.mock("../../state/useApplicationStore", () => ({ reconcileWithBootToken: vi.fn() }));

import PhoneOTPInline from "../PhoneOTPInline";

const fetchMock = vi.fn();
const json = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body, text: async () => JSON.stringify(body) });

function Where() { return <div data-testid="where">{useLocation().pathname}</div>; }

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  getAttribution.mockReset();
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (url: string) => {
    if (url.endsWith("/api/auth/otp/start")) return json(200, { ok: true });
    if (url.endsWith("/api/auth/otp/verify")) return json(200, { token: "jwt-1" });
    if (url.endsWith("/api/client/applications/by-phone")) return json(200, { found: false });
    if (url.endsWith("/api/public/application/start")) return json(200, { applicationId: "app-new" });
    return json(404, {});
  });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function signIn(): Promise<Record<string, unknown>> {
  render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes><Route path="/" element={<PhoneOTPInline />} /><Route path="*" element={<Where />} /></Routes>
    </MemoryRouter>,
  );
  fireEvent.change(screen.getByPlaceholderText("(555) 000-0000"), { target: { value: "4035550101" } });
  fireEvent.change(await screen.findByPlaceholderText("Enter code"), { target: { value: "123456" } });
  await waitFor(() => expect(screen.getByTestId("where").textContent).toBe("/apply/step-1"));
  const mint = fetchMock.mock.calls.filter((c) => String(c[0]).endsWith("/api/public/application/start"));
  expect(mint).toHaveLength(1);
  return JSON.parse(String(mint[0][1].body));
}

describe("the OTP mint call carries attribution", () => {
  it("sends attribution with /api/public/application/start", async () => {
    getAttribution.mockReturnValue({ gclid: "g-123", utm_source: "google" });
    const body = await signIn();
    expect(body.attribution).toEqual({ gclid: "g-123", utm_source: "google" });
    expect(body.source).toBe("client_direct");
  });

  it("still sends readiness_phone so the website draft claim keeps working", async () => {
    getAttribution.mockReturnValue({ gclid: "g-123" });
    const body = await signIn();
    expect(body.readiness_phone).toBe("+14035550101");
  });

  it("omits an empty attribution", async () => {
    getAttribution.mockReturnValue({});
    const body = await signIn();
    expect(body).not.toHaveProperty("attribution");
  });

  it("never lets attribution failure block a login", async () => {
    getAttribution.mockImplementation(() => { throw new Error("storage blocked"); });
    const body = await signIn();
    expect(body).not.toHaveProperty("attribution");
    expect(body.readiness_phone).toBe("+14035550101");
  });
});

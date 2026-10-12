// BF_CLIENT_BLOCK_v130b_STEP5_SCROLL_AND_OTP_PHONE_CLAIM_v1
// The mint call after OTP must send the verified phone as readiness_phone (the
// server's StartSchema key) so the website's credit-readiness draft is claimed;
// a bare "phone" key is stripped by zod and a blank application is minted.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

vi.mock("../QuickSignIn", () => ({ default: (): null => null }));
vi.mock("@/lib/attribution", () => ({ getAttribution: () => ({}) }));
vi.mock("@/client/autosave", () => ({ adoptAnonDrafts: vi.fn(), currentDraftScope: vi.fn(), purgeLegacyDrafts: vi.fn() }));
vi.mock("../../state/useApplicationStore", () => ({ reconcileWithBootToken: vi.fn() }));

import PhoneOTPInline from "../PhoneOTPInline";

const fetchMock = vi.fn();
const json = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body, text: async () => JSON.stringify(body) });

function Where() { return <div data-testid="where">{useLocation().pathname}</div>; }

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
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

describe("PhoneOTPInline readiness_phone payload (v130b mirror)", () => {
  it("sends readiness_phone, and no bare phone key, in the /application/start body", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes><Route path="/" element={<PhoneOTPInline />} /><Route path="*" element={<Where />} /></Routes>
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByPlaceholderText("(555) 000-0000"), { target: { value: "403 555 0101" } });
    fireEvent.change(await screen.findByPlaceholderText("Enter code"), { target: { value: "123456" } });
    await waitFor(() => expect(screen.getByTestId("where").textContent).toBe("/apply/step-1"));

    const mint = fetchMock.mock.calls.filter((c) => String(c[0]).endsWith("/api/public/application/start"));
    expect(mint).toHaveLength(1);
    const body = JSON.parse(String(mint[0][1].body));
    expect(body.readiness_phone).toBe("+14035550101");
    expect(body).not.toHaveProperty("phone");
  });
});

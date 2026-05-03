import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PhoneOTPInline from "../PhoneOTPInline";

const navigateMock = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

function mockFetchSequence(responses: Array<{ ok: boolean; body: any }>) {
  const seq = [...responses];
  return vi.fn().mockImplementation(() => {
    const next = seq.shift();
    if (!next) return Promise.reject(new Error("unexpected fetch"));
    return Promise.resolve({ ok: next.ok, json: () => Promise.resolve(next.body) });
  });
}

async function runOtpFlow() {
  const utils = render(<MemoryRouter><PhoneOTPInline /></MemoryRouter>);
  const phoneInput = utils.container.querySelector('input[type="tel"], input[inputmode="numeric"], input') as HTMLInputElement;
  fireEvent.change(phoneInput, { target: { value: "5875551234" } });
  const sendBtn = utils.container.querySelector("button");
  if (sendBtn) fireEvent.click(sendBtn);
  await waitFor(() => expect(utils.container.querySelectorAll("input")[0]).toBeTruthy());
  await act(async () => fireEvent.change(utils.container.querySelectorAll("input")[0], { target: { value: "000000" } }));
}

beforeEach(() => { navigateMock.mockReset(); localStorage.clear(); });
afterEach(() => { vi.restoreAllMocks(); });

describe("PhoneOTPInline post-OTP routing (v101)", () => {
  it("returning user with submitted app → /application/:id, no mint", async () => {
    const fetchMock = mockFetchSequence([
      { ok: true, body: { ok: true } },
      { ok: true, body: { status: "ok", data: { token: "jwt-token", hasSubmittedApplication: true, submittedApplicationId: "app-123" } } },
    ]);
    vi.stubGlobal("fetch", fetchMock);
    await runOtpFlow();
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/application/app-123"));
    const mintCalled = fetchMock.mock.calls.some(([url]) => typeof url === "string" && url.includes("/api/public/application/start"));
    expect(mintCalled).toBe(false);
    expect(localStorage.getItem("bf_application_token")).toBe("app-123");
  });

  it("first-time user with no submitted app → mint flow → /apply/step-1", async () => {
    const fetchMock = mockFetchSequence([
      { ok: true, body: { ok: true } },
      { ok: true, body: { status: "ok", data: { token: "jwt-token", hasSubmittedApplication: false, submittedApplicationId: null } } },
      { ok: true, body: { applicationToken: "fresh-draft-id" } },
    ]);
    vi.stubGlobal("fetch", fetchMock);
    await runOtpFlow();
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/apply/step-1"));
    expect(localStorage.getItem("bf_application_token")).toBe("fresh-draft-id");
  });
});

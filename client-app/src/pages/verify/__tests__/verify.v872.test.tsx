// BF_CLIENT_v872_KYC - "Verify your identity": hosted vendor link, manual upload, finished states, and the optional
// step after submitting.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const h = vi.hoisted(() => ({ apiCall: vi.fn(), open: vi.fn(), native: false }));
vi.mock("@/api/client", () => ({ apiCall: h.apiCall }));
vi.mock("@/native/openExternal", () => ({ openExternal: h.open }));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => h.native } }));
vi.mock("@/auth/token", () => ({ getToken: () => "tok" }));

import VerifyIdentityPage from "@/pages/verify/VerifyIdentityPage";
import { idVerificationNext } from "@/wizard/idVerificationStep";

const mine = (status: string, mode: "hosted" | "upload" = "hosted") => ({ ok: true, enabled: true, wizard_step: true, verifications: [{ id: "v1", application_id: "app-1", status, mode, requested_at: null as string | null, completed_at: null as string | null }] });

function renderAt(path = "/verify/app-1") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/verify/:applicationId" element={<VerifyIdentityPage />} />
        <Route path="/application/:id" element={<p>Portal page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => { h.apiCall.mockReset(); h.open.mockReset(); h.native = false; });

describe("Verify your identity", () => {
  it("hosted: Start opens the ID-check service in the in-app browser on the phone apps", async () => {
    h.native = true;
    h.apiCall.mockImplementation(async (url: string) => (url.endsWith("/start") ? { ok: true, mode: "hosted", url: "https://ca.onfido.app/l/abc" } : mine("requested")));
    renderAt();
    fireEvent.click(await screen.findByRole("button", { name: "Start" }));
    await waitFor(() => expect(h.open).toHaveBeenCalledWith("https://ca.onfido.app/l/abc"));
    expect(h.apiCall).toHaveBeenCalledWith("/api/client/kyc/verifications/v1/start", { method: "POST" });
  });

  it("manual: needs the ID front and a selfie, then sends them", async () => {
    h.apiCall.mockResolvedValue(mine("requested", "upload"));
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ ok: true, status: "review" }) }));
    vi.stubGlobal("fetch", fetchMock);
    renderAt();
    fireEvent.click(await screen.findByRole("button", { name: "Send" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/front of your ID and a selfie/);
    const img = new File(["x"], "a.jpg", { type: "image/jpeg" });
    fireEvent.change(screen.getByLabelText("Front of your ID"), { target: { files: [img] } });
    fireEvent.change(screen.getByLabelText("A selfie"), { target: { files: [img] } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0] as any;
    expect(url).toMatch(/\/api\/client\/kyc\/verifications\/v1\/upload$/);
    expect(init.headers.Authorization).toBe("Bearer tok");
    expect((init.body as FormData).get("selfie")).toBeTruthy();
    vi.unstubAllGlobals();
  });

  it("finished: plain words and a way back to the application", async () => {
    h.apiCall.mockResolvedValue(mine("approved"));
    renderAt();
    expect((await screen.findByTestId("verify-done")).textContent).toMatch("Your identity is verified");
    fireEvent.click(screen.getByRole("button", { name: "Go to my application" }));
    expect(await screen.findByText("Portal page")).toBeTruthy();
  });
});

describe("the step after submitting", () => {
  it("goes to verification only when Boreal turned it on and a request is open", async () => {
    h.apiCall.mockResolvedValueOnce(mine("requested"));
    expect(await idVerificationNext("app-1")).toBe(true);
    expect(h.apiCall).toHaveBeenCalledWith("/api/client/kyc/applications/app-1?wizard=1");
    h.apiCall.mockResolvedValueOnce({ ok: true, enabled: true, wizard_step: false, verifications: [] });
    expect(await idVerificationNext("app-1")).toBe(false);
    h.apiCall.mockRejectedValueOnce(new Error("offline"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(await idVerificationNext("app-1")).toBe(false);
    warn.mockRestore();
    h.apiCall.mockImplementationOnce(() => new Promise(() => undefined));
    expect(await idVerificationNext("app-1", 20)).toBe(false);
  });
});

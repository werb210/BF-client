// BF_CLIENT_ONE_SIGN_IN_v737
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";

const faceId = vi.hoisted(() => ({ available: true, enrolled: true }));
vi.mock("@/native/deviceSignIn", () => ({
  biometryAvailable: vi.fn(async () => faceId.available),
  isEnrolled: vi.fn(async () => faceId.enrolled),
  phoneFromToken: vi.fn(() => "+15875550199"),
  signInWithFaceId: vi.fn(async () => ({ token: "t", hasSubmittedApplication: true, submittedApplicationId: "app-9" })),
}));
vi.mock("@/auth/passkeys", () => ({ passkeysSupported: () => false, signInWithPasskey: vi.fn(), PasskeyError: class extends Error {} }));
vi.mock("@/utils/analytics", () => ({ identifyClarity: vi.fn() }));

import QuickSignIn from "../QuickSignIn";

function Where() { const l = useLocation(); return <div data-testid="where">{l.pathname}</div>; }

describe("one sign-in screen", () => {
  beforeEach(() => { faceId.available = true; faceId.enrolled = true; });
  it("the landing sign-in offers Face ID and opens the client's application after it", async () => {
    render(<MemoryRouter initialEntries={["/"]}><Routes><Route path="/" element={<QuickSignIn />} /><Route path="*" element={<Where />} /></Routes></MemoryRouter>);
    const btn = await screen.findByTestId("face-id-sign-in");
    fireEvent.click(btn);
    await waitFor(() => expect(screen.getByTestId("where").textContent).toBe("/application/app-9"));
  });
  it("shows nothing when neither Face ID nor a passkey is available", async () => {
    faceId.available = false;
    const { container } = render(<MemoryRouter><QuickSignIn /></MemoryRouter>);
    await waitFor(() => expect(container.querySelector("[data-testid='quick-sign-in']")).toBeNull());
  });
  it("/otp opens the landing page, which carries the Face ID / passkey sign-in", () => {
    const router = readFileSync("src/router/AppRouter.tsx", "utf8");
    expect(router).toContain('<Route path="/otp" element={<OtpToLanding />} />');
    expect(router).toContain('return <Navigate to={{ pathname: "/", search: location.search }} replace />;');
    expect(readFileSync("src/components/PhoneOTPInline.tsx", "utf8")).toContain("<QuickSignIn />");
  });
  it("looks for an existing application before minting a new one, and opens it at a real route", () => {
    const inline = readFileSync("src/components/PhoneOTPInline.tsx", "utf8");
    expect(inline.indexOf("'/api/client/applications/by-phone'")).toBeLessThan(inline.indexOf("API_BASE + '/api/public/application/start'"));
    expect(inline).toContain("navigate('/application/' + String(lb.application.id));");
    expect(inline).not.toContain("navigate('/portal/' + String(appToken));");
  });
});

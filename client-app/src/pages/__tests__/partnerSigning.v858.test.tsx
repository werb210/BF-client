// BF_CLIENT_v858_PARTNER_SIGNING - the client portal for a partner (Elizabeth Cullen, Owner 2 on Poke Prod LLC).
import { describe, it, expect, afterEach, vi } from "vitest";
import { act, screen } from "@testing-library/react";
import { actionCenter, apiError, renderPortal, setApi } from "./miniPortalHarness";

const ELIZ = { index: 2, role: "Owner 2", name: "Elizabeth Cullen", isApplicant: false };

afterEach(() => { vi.restoreAllMocks(); setApi({ "/api/client/signing-session": { status: "not_ready" } }); });

describe("v858 partner signing in the client portal", () => {
  it("her turn: the to-do names her owner slot", async () => {
    setApi({ "/api/client/signing-session": { status: "ready", url: "https://signnow.test/link/elizabeth", ownerLink: "https://server.test/api/signing/owner/elizabeth", signer: ELIZ } });
    await renderPortal();
    const items = actionCenter().extraItems ?? [];
    expect(items.map((i: any) => i.label)).toEqual(["Sign the application documents as Owner 2"]);
    expect(screen.queryByTestId("cmp-sign-notice")).toBeNull();
    await act(async () => { actionCenter().onAction?.(items[0]!); });
    expect(screen.getByTitle("Sign documents").getAttribute("src")).toBe("https://signnow.test/link/elizabeth");
    expect(screen.getByTestId("cmp-sign-own-link").getAttribute("href")).toBe("https://server.test/api/signing/owner/elizabeth");
  });

  it("before Sean signs: no to-do, and the portal says who she is waiting for", async () => {
    setApi({ "/api/client/signing-session": { status: "not_ready", reason: "waiting_for_signer", waitingFor: "Sean Dwyer", signer: ELIZ } });
    await renderPortal();
    expect(actionCenter().extraItems ?? []).toEqual([]);
    expect(screen.getByTestId("cmp-sign-notice").textContent).toBe("Waiting for Sean Dwyer to sign first. We will let you know when it is your turn.");
  });

  it("after she signed: the portal says so", async () => {
    setApi({ "/api/client/signing-session": { status: "signed", signer: ELIZ } });
    await renderPortal();
    expect(screen.getByTestId("cmp-sign-notice").textContent).toBe("You have signed your documents. Thank you!");
  });

  it("the applicant still sees the old to-do and no notice", async () => {
    setApi({ "/api/client/signing-session": { status: "ready", url: "https://signnow.test/link/sean", signer: { index: 1, role: "Owner 1", name: "Sean Dwyer", isApplicant: true } } });
    await renderPortal();
    expect((actionCenter().extraItems ?? []).map((i: any) => i.label)).toEqual(["Sign your application documents"]);
    expect(screen.queryByTestId("cmp-sign-notice")).toBeNull();
  });

  it("not a signer (403): no to-do", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    setApi({ "/api/client/signing-session": { status: "ready", url: "https://signnow.test/link/elizabeth", signer: ELIZ } });
    await renderPortal();
    const item = actionCenter().extraItems![0]!;
    setApi({ "/api/client/signing-session": apiError(403, "You are not listed as a signer on this application") });
    await act(async () => { actionCenter().onAction?.(item); });
    expect(actionCenter().extraItems ?? []).toEqual([]);
    expect(screen.getByTestId("cmp-sign-text").textContent).toMatch(/^You are not listed as a signer on this application\./);
  });
});

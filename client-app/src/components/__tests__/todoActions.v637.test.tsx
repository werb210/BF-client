// BF_CLIENT_TODO_ACTIONS_v637
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { actionLine } from "../../native/clientWidget";

vi.mock("../../api/client", () => ({
  apiCall: vi.fn(async () => ({
    outstanding: [
      { key: "pgi", kind: "action", label: "Complete your Personal Guarantee Insurance application", urgent: true, action: "https://example.test/pgi" },
      { key: "form:sba_forms", kind: "form", label: "SBA forms", urgent: false, action: "sba_forms" },
    ],
    completed: [],
    outstandingCount: 2,
  })),
}));
vi.mock("@/native/appBadge", () => ({ setAppBadge: vi.fn() }));
vi.mock("@/native/clientWidget", async () => ({ ...(await vi.importActual<any>("../../native/clientWidget")), updateClientWidget: vi.fn() }));

import ActionCenter from "../ActionCenter";

const page = readFileSync("src/pages/MiniPortalPage.tsx", "utf-8");

describe("v637 PGI, SBA forms and signing in What you need to do", () => {
  it("lists server prompts and the page's signing item, with fitting buttons", async () => {
    const onAction = vi.fn();
    render(<ActionCenter applicationId="a1" onAction={onAction} extraItems={[{ key: "sign", kind: "action", label: "Sign your application documents", urgent: false, action: "sign" }]} />);
    await screen.findByText("Complete your Personal Guarantee Insurance application");
    expect(screen.getByText("3 items remaining")).toBeTruthy();
    expect(screen.getByText("Sign")).toBeTruthy();
    expect(screen.getByText("Open")).toBeTruthy();
    expect(screen.getByText("Fill in")).toBeTruthy();
    expect(screen.queryByText(/Needs re-uploading/)).toBeNull();
    fireEvent.click(screen.getByText("Open"));
    expect(onAction).toHaveBeenCalledWith(expect.objectContaining({ key: "pgi", action: "https://example.test/pgi" }));
  });

  it("says it plainly on the widget", () => {
    expect(actionLine([{ kind: "action" }])).toBe("Complete 1 step");
    expect(actionLine([{ kind: "document" }, { kind: "action" }])).toBe("Upload 1 document · Complete 1 step");
  });

  it("the chat no longer carries the signing prompt; the page runs item actions like chat buttons", () => {
    expect(page).not.toContain('data-testid="sign-prompt-note"');
    expect(page).toContain("extraItems={todoExtras}");
    expect(page).toContain("if (item.action) { ctaRef.current(item.action); return; }");
  });
});

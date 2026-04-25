/* @vitest-environment jsdom */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MayaFloatingButton from "../MayaFloatingButton";
import { apiRequest } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  apiRequest: vi.fn(),
}));

vi.mock("../MayaClientChat", () => ({
  default: () => <div data-testid="maya-client-chat">Mock Maya Chat</div>,
}));

describe("MayaFloatingButton", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    vi.mocked(apiRequest).mockReset();
    vi.mocked(apiRequest).mockResolvedValue({ ok: true } as Response);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  function clickByText(text: string) {
    const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
      candidate.textContent?.includes(text)
    );
    expect(button).toBeTruthy();
    act(() => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
  }

  it("calls apiRequest when Talk to a Human is clicked and shows confirmation", async () => {
    await act(async () => {
      root.render(<MayaFloatingButton />);
    });

    clickByText("💬");
    clickByText("Talk to a Human");

    expect(apiRequest).toHaveBeenCalledWith("/api/maya/escalate", {
      method: "POST",
      body: JSON.stringify({ reason: "user_requested_human" }),
    });

    await act(async () => {
      await Promise.resolve();
    });
    expect(container.textContent).toContain("A team member has been notified and will reach out shortly.");
  });

  it("opens chat view and closes back to closed view", async () => {
    await act(async () => {
      root.render(<MayaFloatingButton />);
    });

    clickByText("💬");
    clickByText("Chat with Maya");
    expect(container.querySelector('[data-testid="maya-client-chat"]')).toBeTruthy();

    const closeButton = container.querySelector('button[aria-label="Close"]');
    expect(closeButton).toBeTruthy();
    act(() => {
      closeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.querySelector('[data-testid="maya-client-chat"]')).toBeFalsy();
    expect(container.querySelector('button[aria-label="Open assistant"]')).toBeTruthy();
  });
});

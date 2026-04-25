/* @vitest-environment jsdom */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MayaFloatingButton from "../MayaFloatingButton";

vi.mock("../MayaClientChat", () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div>
      <div data-testid="maya-client-chat">Mock Maya Chat</div>
      <button aria-label="Close" onClick={onClose}>×</button>
    </div>
  ),
}));

describe("MayaFloatingButton", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("opens chat from the floating button", async () => {
    await act(async () => {
      root.render(<MayaFloatingButton />);
    });

    const openButton = container.querySelector('button[aria-label="Open assistant"]');
    expect(openButton).toBeTruthy();

    act(() => {
      openButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.querySelector('[data-testid="maya-client-chat"]')).toBeTruthy();
  });

  it("closes chat when onClose is invoked", async () => {
    await act(async () => {
      root.render(<MayaFloatingButton />);
    });

    const openButton = container.querySelector('button[aria-label="Open assistant"]');
    act(() => {
      openButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const closeButton = container.querySelector('button[aria-label="Close"]');
    expect(closeButton).toBeTruthy();
    act(() => {
      closeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.querySelector('[data-testid="maya-client-chat"]')).toBeFalsy();
    expect(container.querySelector('button[aria-label="Open assistant"]')).toBeTruthy();
  });
});

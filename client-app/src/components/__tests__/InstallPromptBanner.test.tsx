/* @vitest-environment jsdom */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import InstallPromptBanner from "../InstallPromptBanner";

describe("InstallPromptBanner", () => {
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

  it("renders nothing without a beforeinstallprompt event", async () => {
    await act(async () => {
      root.render(<InstallPromptBanner />);
    });

    expect(container.innerHTML).toBe("");
  });
});

/* @vitest-environment jsdom */
import { act } from "react";
import { fireEvent } from "@testing-library/dom";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MayaClientChat from "../MayaClientChat";

const apiRequestMock = vi.fn();

vi.mock("@/lib/api", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}));

vi.mock("@/api/issues", () => ({
  submitIssueReport: vi.fn(),
}));

vi.mock("@/state/useApplicationStore", () => ({
  useApplicationStore: () => ({ app: { applicationId: "app-123" } }),
}));

describe("MayaClientChat", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    (Element.prototype as any).scrollIntoView = vi.fn();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    apiRequestMock.mockReset();
    apiRequestMock.mockResolvedValue({ reply: "ok" });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("includes application_id when sending a message", async () => {
    await act(async () => {
      root.render(<MayaClientChat />);
    });

    const input = container.querySelector('input[placeholder="Ask Maya anything…"]') as HTMLInputElement;
    expect(input).toBeTruthy();

    act(() => {
      fireEvent.change(input, { target: { value: "help" } });
    });

    const sendButton = Array.from(container.querySelectorAll("button")).find((btn) => btn.textContent === "Send");
    expect(sendButton).toBeTruthy();

    await act(async () => {
      fireEvent.click(sendButton!);
    });

    expect(apiRequestMock).toHaveBeenCalledWith("/api/maya/message", {
      method: "POST",
      body: { message: "help", source: "client", application_id: "app-123" },
    });
  });
});

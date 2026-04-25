/* @vitest-environment jsdom */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MayaFloatingButton from "../MayaFloatingButton";
import { apiRequest } from "@/lib/api";
import { submitIssueReport } from "@/api/issues";

vi.mock("@/lib/api", () => ({
  apiRequest: vi.fn(),
}));

vi.mock("@/api/issues", () => ({
  submitIssueReport: vi.fn(),
}));

vi.mock("html2canvas", () => ({
  default: vi.fn(async () => ({
    toDataURL: () => "data:image/png;base64,mock",
  })),
}));

vi.mock("../MayaClientChat", () => ({
  default: ({ initialGreeting }: { initialGreeting?: string }) => (
    <div data-testid="maya-client-chat">{initialGreeting ?? "Mock Maya Chat"}</div>
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
    vi.mocked(apiRequest).mockReset();
    vi.mocked(apiRequest).mockResolvedValue({ ok: true } as Response);
    vi.mocked(submitIssueReport).mockReset();
    vi.mocked(submitIssueReport).mockResolvedValue({ ok: true } as never);
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

  it("opens directly to chat view with the greeting", async () => {
    await act(async () => {
      root.render(<MayaFloatingButton />);
    });

    clickByText("💬");
    expect(container.querySelector('[data-testid="maya-client-chat"]')?.textContent).toContain(
      "Hi, I'm Maya. How can I help you with your application today?"
    );
  });

  it("calls apiRequest when Talk to Human is clicked and shows confirmation", async () => {
    await act(async () => {
      root.render(<MayaFloatingButton />);
    });

    clickByText("💬");
    clickByText("Talk to Human");

    expect(apiRequest).toHaveBeenCalledWith("/api/maya/escalate", {
      method: "POST",
      body: JSON.stringify({ reason: "user_requested_human" }),
    });

    await act(async () => {
      await Promise.resolve();
    });
    expect(container.textContent).toContain("✓ A team member has been notified.");
  });

  it("opens report issue form from chat view", async () => {
    await act(async () => {
      root.render(<MayaFloatingButton />);
    });

    clickByText("💬");
    clickByText("Report Issue");
    expect(container.querySelector('textarea[placeholder=\"Describe the issue\"]')).toBeTruthy();
  });

  it("submits issue report and shows confirmation pill", async () => {
    await act(async () => {
      root.render(<MayaFloatingButton />);
    });

    clickByText("💬");
    clickByText("Report Issue");

    const textarea = container.querySelector('textarea[placeholder=\"Describe the issue\"]') as HTMLTextAreaElement;
    expect(textarea).toBeTruthy();
    act(() => {
      textarea.value = "Broken dropdown";
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      textarea.dispatchEvent(new Event("change", { bubbles: true }));
    });

    clickByText("Send Report");

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(container.textContent).toContain("✓ Thanks — your report was sent.");
    expect(submitIssueReport).toHaveBeenCalled();
  });

  it("closes back to closed view", async () => {
    await act(async () => {
      root.render(<MayaFloatingButton />);
    });

    clickByText("💬");

    const closeButton = container.querySelector('button[aria-label="Close"]');
    expect(closeButton).toBeTruthy();
    act(() => {
      closeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.querySelector('[data-testid="maya-client-chat"]')).toBeFalsy();
    expect(container.querySelector('button[aria-label="Open assistant"]')).toBeTruthy();
  });
});

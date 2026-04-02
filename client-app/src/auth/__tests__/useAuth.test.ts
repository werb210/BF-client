import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../useAuth";

const getMeMock = vi.fn();
vi.mock("@/api/auth", () => ({
  getMe: () => getMeMock(),
}));

function Harness({ onUpdate }: { onUpdate: (state: { user: Record<string, unknown> | null; loading: boolean }) => void }) {
  const state = useAuth();
  onUpdate(state);
  return null;
}

describe("useAuth", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    getMeMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("ends loading even if auth retries fail", async () => {
    getMeMock.mockRejectedValue(new Error("offline"));
    const onUpdate = vi.fn();
    const container = document.createElement("div");
    const root = createRoot(container);

    await act(async () => {
      root.render(createElement(Harness, { onUpdate }));
      await vi.runAllTicks();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
      await vi.runAllTicks();
      await Promise.resolve();
    });

    const final = onUpdate.mock.calls.at(-1)?.[0];
    expect(final).toEqual({ user: null, loading: false });
    expect(getMeMock).toHaveBeenCalledTimes(3);

    await act(async () => {
      root.unmount();
    });
  });
});

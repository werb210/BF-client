import { describe, expect, it, vi } from "vitest";
import {
  getInitialOfflineState,
  subscribeToNetworkStatus,
} from "../hooks/useNetworkStatus";

describe("network status", () => {
  it("getInitialOfflineState is always optimistic (online)", () => {
    expect(getInitialOfflineState()).toBe(false);
  });

  it("subscribeToNetworkStatus returns an unsubscribe function", () => {
    const unsubscribe = subscribeToNetworkStatus(() => {});
    expect(typeof unsubscribe).toBe("function");
    expect(() => unsubscribe()).not.toThrow();
  });
});

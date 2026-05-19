// BF_CLIENT_BLOCK_v316_SUBMIT_RETRY_UX_v1
import { describe, it, expect, beforeEach } from "vitest";
import {
  savePendingSubmit,
  clearPendingSubmit,
  subscribeRetry,
  getRetryState,
} from "../pendingSubmit";

beforeEach(() => { localStorage.clear(); });

describe("pendingSubmit pubsub", () => {
  it("emits 'queued' when savePendingSubmit is called", () => {
    const events: string[] = [];
    const unsub = subscribeRetry((e) => events.push(e.type));
    savePendingSubmit("tok-123", { foo: 1 });
    expect(events).toContain("queued");
    unsub();
  });

  it("emits 'cleared' when clearPendingSubmit is called", () => {
    savePendingSubmit("tok-123", { foo: 1 });
    const events: string[] = [];
    const unsub = subscribeRetry((e) => events.push(e.type));
    clearPendingSubmit();
    expect(events).toContain("cleared");
    unsub();
  });

  it("getRetryState reflects pending entry", () => {
    savePendingSubmit("tok-123", { foo: 1 });
    const s = getRetryState();
    expect(s.pending).toBe(true);
    expect(s.attempts).toBe(0);
  });
});

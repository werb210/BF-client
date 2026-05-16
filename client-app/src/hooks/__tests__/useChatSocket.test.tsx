import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { useChatSocket } from "../useChatSocket";

class MockSocket {
  static instances: MockSocket[] = [];
  static OPEN = 1;
  static CLOSED = 3;
  readyState = MockSocket.OPEN;
  onopen: null | (() => void) = null;
  onclose: null | (() => void) = null;
  onerror: null | (() => void) = null;
  onmessage: null | ((event: { data: string }) => void) = null;
  sent: string[] = [];

  constructor(public url: string) {
    MockSocket.instances.push(this);
    queueMicrotask(() => this.onopen?.());
  }

  send(payload: string) {
    this.sent.push(payload);
  }

  close() {
    this.readyState = MockSocket.CLOSED;
    this.onclose?.();
  }
}

function Harness({ onHumanActive, onMessage }: { onHumanActive: () => void; onMessage: (message: string) => void }): null {
  useChatSocket({
    enabled: true,
    sessionId: "session-1",
    readinessToken: "ready-1",
    userMetadata: { contactEmail: "a@example.com" },
    onHumanActive,
    onMessage,
  });
  return null;
}

describe.skip("useChatSocket", () => {
  const originalWebSocket = globalThis.WebSocket;

  beforeEach(() => {
    vi.useFakeTimers();
    MockSocket.instances = [];
    (globalThis as unknown as { WebSocket: typeof WebSocket }).WebSocket = MockSocket as unknown as typeof WebSocket;
  });

  afterEach(() => {
    vi.useRealTimers();
    (globalThis as unknown as { WebSocket: typeof WebSocket }).WebSocket = originalWebSocket;
  });

  it("marks human takeover when staff_joined event is received", async () => {
    const onHumanActive = vi.fn();
    const onMessage = vi.fn();
    const container = document.createElement("div");
    const root = createRoot(container);

    await act(async () => {
      root.render(<Harness onHumanActive={onHumanActive} onMessage={onMessage} />);
      await vi.runAllTicks();
    });

    const socket = MockSocket.instances[0];
    expect(socket.url).toContain("/ws/chat");

    act(() => {
      socket.onmessage?.({ data: JSON.stringify({ type: "staff_joined" }) });
      socket.onmessage?.({ data: JSON.stringify({ message: "AI response" }) });
    });

    expect(onHumanActive).toHaveBeenCalledTimes(1);
    expect(onMessage).toHaveBeenCalledTimes(1);

    root.unmount();
  }, 20000);


  it("sends join payload with session id on connect", async () => {
    const onHumanActive = vi.fn();
    const onMessage = vi.fn();
    const container = document.createElement("div");
    const root = createRoot(container);

    await act(async () => {
      root.render(<Harness onHumanActive={onHumanActive} onMessage={onMessage} />);
      await vi.runAllTicks();
    });

    // BF_CLIENT_BLOCK_BI_ROUND6_CHAT_PROTOCOL_FIX_v1 -- the join
    // frame now matches what BF-Server's socket handler accepts:
    // type "join_session", userId required (falls back to
    // sessionId when not provided), readinessToken passed through.
    const socket = MockSocket.instances[0];
    expect(socket.sent).toHaveLength(1);
    expect(JSON.parse(socket.sent[0])).toEqual(
      expect.objectContaining({
        type: "join_session",
        sessionId: "session-1",
        userId: "session-1",
        readinessToken: "ready-1",
      })
    );

    root.unmount();
  }, 20000);

  it("reconnects with exponential backoff after close", async () => {
    const onHumanActive = vi.fn();
    const onMessage = vi.fn();
    const container = document.createElement("div");
    const root = createRoot(container);

    await act(async () => {
      root.render(<Harness onHumanActive={onHumanActive} onMessage={onMessage} />);
      await vi.runAllTicks();
    });

    expect(MockSocket.instances).toHaveLength(1);

    act(() => {
      MockSocket.instances[0].onclose?.();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(MockSocket.instances).toHaveLength(2);

    act(() => {
      MockSocket.instances[1].onclose?.();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(MockSocket.instances).toHaveLength(3);

    act(() => {
      MockSocket.instances[2].onclose?.();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(MockSocket.instances).toHaveLength(4);

    act(() => {
      MockSocket.instances[3].onclose?.();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });
    expect(MockSocket.instances).toHaveLength(5);

    root.unmount();
  }, 20000);

  it("stops reconnecting after retry cap", async () => {
    const onHumanActive = vi.fn();
    const onMessage = vi.fn();
    const container = document.createElement("div");
    const root = createRoot(container);

    await act(async () => {
      root.render(<Harness onHumanActive={onHumanActive} onMessage={onMessage} />);
      await vi.runAllTicks();
    });

    for (const delay of [1000, 2000, 5000, 10000]) {
      act(() => {
        MockSocket.instances[MockSocket.instances.length - 1].onclose?.();
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(delay + 2500);
      });
    }

    const before = MockSocket.instances.length;
    act(() => {
      MockSocket.instances[MockSocket.instances.length - 1].onclose?.();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(20000);
    });

    expect(MockSocket.instances.length).toBe(before);

    root.unmount();
  }, 20000);
});

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { hasToken } from "@/api/auth";
import { getToken } from "@/auth/token";

type ChatSocketStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "failed"
  | "disconnected";

// BF_CLIENT_BLOCK_BI_ROUND6_CHAT_PROTOCOL_FIX_v1 -- added userId
// (required by BF-Server socket.server.ts:203-207) and a send()
// return so the consumer can post user messages.
interface UseChatSocketOptions {
  enabled: boolean;
  sessionId: string | null;
  userId?: string | null;
  readinessToken?: string | null;
  userMetadata?: Record<string, string | null | undefined>;
  onHumanActive?: () => void;
  onMessage?: (message: string) => void;
}

const MAX_RETRY_DELAY_MS = 10000;
const RETRY_DELAYS_MS = [1000, 2000, 5000, 10000];
const MAX_RETRY_ATTEMPTS = RETRY_DELAYS_MS.length;
const HEARTBEAT_INTERVAL_MS = 25000;
const RETRY_JITTER_RATIO = 0.2;

function getSocketUrl() {
  if (typeof window === "undefined") return "";
  const token = getToken();
  if (!token) return "";
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${window.location.host}/ws/chat?token=${encodeURIComponent(token)}`;
}

export function useChatSocket({
  enabled,
  sessionId,
  userId,
  readinessToken,
  onHumanActive,
  onMessage,
  userMetadata,
}: UseChatSocketOptions) {
  const socketRef = useRef<WebSocket | null>(null);
  const retryTimerRef = useRef<number | null>(null);
  const retryCountRef = useRef(0);
  const intentionalCloseRef = useRef(false);
  const heartbeatTimerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const enabledRef = useRef(enabled);
  const onMessageRef = useRef(onMessage);
  const onHumanActiveRef = useRef(onHumanActive);
  const [status, setStatus] = useState<ChatSocketStatus>("idle");

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    onHumanActiveRef.current = onHumanActive;
  }, [onHumanActive]);

  const clearRetryTimer = useCallback(() => {
    if (retryTimerRef.current !== null) {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const clearHeartbeatTimer = useCallback(() => {
    if (heartbeatTimerRef.current !== null) {
      window.clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  }, []);

  const setSafeStatus = useCallback((next: ChatSocketStatus) => {
    if (mountedRef.current) {
      setStatus(next);
    }
  }, []);

  const disconnect = useCallback(() => {
    intentionalCloseRef.current = true;
    clearRetryTimer();
    clearHeartbeatTimer();
    retryCountRef.current = 0;
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    setSafeStatus("disconnected");
  }, [clearHeartbeatTimer, clearRetryTimer, setSafeStatus]);

  const connect = useCallback(() => {
    if (!enabledRef.current || !sessionId || typeof window === "undefined" || !hasToken()) return;

    const socketUrl = getSocketUrl();
    if (!socketUrl) return;

    clearRetryTimer();

    try {
      intentionalCloseRef.current = false;
      setSafeStatus(retryCountRef.current > 0 ? "reconnecting" : "connecting");
      const socket = new WebSocket(socketUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        retryCountRef.current = 0;
        setSafeStatus("connected");
        clearHeartbeatTimer();
        heartbeatTimerRef.current = window.setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: "ping", sessionId }));
          }
        }, HEARTBEAT_INTERVAL_MS);
        // BF_CLIENT_BLOCK_BI_ROUND6_CHAT_PROTOCOL_FIX_v1
        // Server (BF-Server src/modules/ai/socket.server.ts) accepts
        // "join_session" or "connect" -- NOT "join". Also requires a
        // non-empty userId; fall back to sessionId so anonymous
        // chat sessions still register their presence.
        const effectiveUserId =
          (userId && userId.trim()) || sessionId || "";
        socket.send(
          JSON.stringify({
            type: "join_session",
            sessionId,
            userId: effectiveUserId,
            readinessToken: readinessToken || undefined,
            userMetadata: userMetadata || undefined,
          })
        );
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data as string) as {
            type?: string;
            mode?: string;
            message?: string;
            content?: string;
          };

          if (
            payload.type === "HUMAN_ACTIVE" ||
            payload.mode === "HUMAN_ACTIVE" ||
            payload.type === "staff_joined"
          ) {
            onHumanActiveRef.current?.();
            return;
          }

          if (payload.type === "AI_ACTIVE" || payload.mode === "AI_ACTIVE") {
            return;
          }

          const nextMessage = payload.message || payload.content;
          if (nextMessage) {
            onMessageRef.current?.(nextMessage);
          }
        } catch {
          // ignore malformed payloads
        }
      };

      socket.onclose = () => {
        clearHeartbeatTimer();
        socketRef.current = null;
        if (!enabledRef.current || intentionalCloseRef.current) {
          setSafeStatus("disconnected");
          return;
        }

        retryCountRef.current += 1;
        if (retryCountRef.current > MAX_RETRY_ATTEMPTS) {
          clearRetryTimer();
          setSafeStatus("failed");
          return;
        }
        const baseDelay =
          RETRY_DELAYS_MS[Math.min(retryCountRef.current - 1, RETRY_DELAYS_MS.length - 1)] ??
          MAX_RETRY_DELAY_MS;
        const jitter = baseDelay * RETRY_JITTER_RATIO * Math.random();
        const delay = Math.min(MAX_RETRY_DELAY_MS, Math.round(baseDelay + jitter));
        setSafeStatus("reconnecting");
        retryTimerRef.current = window.setTimeout(connect, delay);
      };

      socket.onerror = () => {
        setSafeStatus("reconnecting");
      };
    } catch {
      setSafeStatus("reconnecting");
    }
  }, [clearHeartbeatTimer, clearRetryTimer, readinessToken, sessionId, setSafeStatus, userId, userMetadata]);

  useEffect(() => {
    if (enabled && sessionId) {
      connect();
    }
    return disconnect;
  }, [connect, disconnect, enabled, sessionId]);

  // BF_CLIENT_BLOCK_BI_ROUND6_CHAT_PROTOCOL_FIX_v1
  // send() emits the canonical user_message frame the server
  // dispatches in socket.server.ts:277. Returns true iff the
  // socket is currently OPEN and the frame was sent. The
  // consumer (ChatSupportWidget) uses the return value to decide
  // whether to append the message to its local thread; on false
  // it discards the input and the user re-tries when the status
  // chip flips back to connected.
  const send = useCallback((content: string) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    if (!sessionId) return false;
    const trimmed = String(content ?? "").trim();
    if (!trimmed) return false;
    try {
      socket.send(JSON.stringify({
        type: "user_message",
        sessionId,
        content: trimmed,
      }));
      return true;
    } catch {
      return false;
    }
  }, [sessionId]);

  return useMemo(
    () => ({
      status,
      connected: status === "connected",
      reconnecting: status === "reconnecting",
      failed: status === "failed",
      disconnect,
      send,
    }),
    [disconnect, send, status]
  );
}

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

interface UseChatSocketOptions {
  enabled: boolean;
  sessionId: string | null;
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
        socket.send(
          JSON.stringify({
            type: "join",
            sessionId,
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
  }, [clearHeartbeatTimer, clearRetryTimer, readinessToken, sessionId, setSafeStatus, userMetadata]);

  useEffect(() => {
    if (enabled && sessionId) {
      connect();
    }
    return disconnect;
  }, [connect, disconnect, enabled, sessionId]);

  return useMemo(
    () => ({
      status,
      connected: status === "connected",
      reconnecting: status === "reconnecting",
      failed: status === "failed",
      disconnect,
    }),
    [disconnect, status]
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { QualificationSummary } from "./QualificationSummary";
import { StartupWaitlistForm } from "./StartupWaitlistForm";
import { useMayaSession } from "../store/mayaSession";
import api from "@/api/client";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  optimistic?: boolean;
};

type MayaMessage = {
  id?: string | number;
  role?: string;
  content?: string;
  message?: string;
  createdAt?: string | number;
  created_at?: string | number;
};

function toMayaMessageList(data: unknown): MayaMessage[] {
  if (typeof data === "object" && data !== null && "messages" in data) {
    const maybeMessages = (data as { messages?: unknown }).messages;
    return Array.isArray(maybeMessages) ? (maybeMessages as MayaMessage[]) : [];
  }
  return Array.isArray(data) ? (data as MayaMessage[]) : [];
}

function mapMessages(entries: MayaMessage[]): ChatMessage[] {
  return entries.map((entry: MayaMessage, index: number) => ({
    id: String(entry.id || `${index}`),
    role: entry.role === "assistant" ? "assistant" : "user",
    content: String(entry.content || entry.message || ""),
    createdAt: new Date(entry.createdAt || entry.created_at || Date.now()).getTime(),
  }));
}

export default function MayaClientChat({
  applicationId,
  initialGreeting,
}: {
  applicationId?: string | null;
  initialGreeting?: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [showStartupWaitlist] = useState(false);
  const [sending, setSending] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [typing, setTyping] = useState(false);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const setField = useMayaSession((state) => state.setField);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const onResize = () => {
      const diff = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      setKeyboardHeight(diff);
    };
    viewport.addEventListener("resize", onResize);
    viewport.addEventListener("scroll", onResize);
    onResize();
    return () => {
      viewport.removeEventListener("resize", onResize);
      viewport.removeEventListener("scroll", onResize);
    };
  }, []);

  useEffect(() => {
    if (!initialGreeting) return;

    setMessages((prev) => {
      if (prev.length > 0) return prev;
      return [
        {
          id: `greeting-${Date.now()}`,
          role: "assistant",
          content: initialGreeting,
          createdAt: Date.now(),
        },
      ];
    });
  }, [initialGreeting]);

  const sortedMessages = useMemo(
    () => [...messages].sort((a, b) => a.createdAt - b.createdAt),
    [messages]
  );

  useEffect(() => {
    if (!scrollerRef.current) return;
    scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
  }, [sortedMessages, keyboardHeight, typing]);

  useEffect(() => {
    if (!applicationId) return;
    let active = true;

    const load = async () => {
      try {
        const response = await api.get(`/api/messages/${applicationId}`);
        const { data } = response;
        if (!active) return;
        const mappedMessages = mapMessages(toMayaMessageList(data));

        if (mappedMessages.length === 0 && initialGreeting) {
          setMessages([
            {
              id: `greeting-${Date.now()}`,
              role: "assistant",
              content: initialGreeting,
              createdAt: Date.now(),
            },
          ]);
          return;
        }

        setMessages(mappedMessages);
      } catch {
        // noop
      }
    };

    void load();
    const timer = window.setInterval(load, 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [applicationId, initialGreeting]);

  async function sendMessage() {
    if (!input.trim() || !applicationId || sending) return;

    const nextMessage = input.trim();
    const optimisticId = `tmp-${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: optimisticId,
      role: "user",
      content: nextMessage,
      createdAt: Date.now(),
      optimistic: true,
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setInput("");
    setSending(true);
    setTyping(true);

    try {
      await api.post("/api/messages", {
        applicationId,
        message: nextMessage,
      });

      const response = await api.get(`/api/messages/${applicationId}`);
      const { data } = response;
      const mappedMessages = mapMessages(toMayaMessageList(data));
      setMessages(mappedMessages);
      setField("last_message", nextMessage);
    } catch {
      setMessages((prev) =>
        prev.map((item) => (item.id === optimisticId ? { ...item, optimistic: false } : item))
      );
    } finally {
      setSending(false);
      setTyping(false);
    }
  }

  return (
    <div
      id="portal-messages"
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        ref={scrollerRef}
        style={{ flex: 1, overflowY: "auto", padding: "12px 12px 8px" }}
        aria-live="polite"
      >
        {sortedMessages.map((message) => (
          <div
            key={message.id}
            style={{
              marginBottom: 8,
              display: "flex",
              justifyContent: message.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            <div
              style={{
                maxWidth: "85%",
                padding: "8px 10px",
                borderRadius: 10,
                background: message.role === "assistant" ? "#f3f4f6" : "#2563eb",
                color: message.role === "assistant" ? "#111827" : "#fff",
                fontSize: 14,
              }}
            >
              {message.content}
            </div>
          </div>
        ))}
        {typing ? <div style={{ opacity: 0.7 }}>Staff is typing…</div> : null}
      </div>

      <div
        style={{
          borderTop: "1px solid #e5e7eb",
          padding: "8px 12px",
          paddingBottom: keyboardHeight ? 8 : 8,
        }}
      >
        <input
          aria-label="Message input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          style={{
            width: "75%",
            padding: "8px",
            border: "1px solid #d1d5db",
            borderRadius: 8,
            marginRight: 8,
          }}
        />
        <button onClick={sendMessage} disabled={sending}>
          Send
        </button>
      </div>

      <QualificationSummary />
      {showStartupWaitlist && <StartupWaitlistForm />}
    </div>
  );
}

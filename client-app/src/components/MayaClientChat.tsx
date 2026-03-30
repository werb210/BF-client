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

export default function MayaClientChat({ applicationId }: { applicationId?: string | null }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [escalated, setEscalated] = useState(false);
  const [showStartupWaitlist] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
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
        const list = Array.isArray((data as any)?.messages)
          ? (data as any).messages
          : Array.isArray(data)
            ? (data as any)
            : [];
        setMessages(
          list.map((entry: any, index: number) => ({
            id: String(entry.id || `${index}`),
            role: entry.role === "assistant" ? "assistant" : "user",
            content: String(entry.content || entry.message || ""),
            createdAt: new Date(entry.createdAt || entry.created_at || Date.now()).getTime(),
          }))
        );
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
  }, [applicationId]);

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
      const list = Array.isArray((data as any)?.messages)
        ? (data as any).messages
        : Array.isArray(data)
          ? (data as any)
          : [];
      setMessages(
        list.map((entry: any, index: number) => ({
          id: String(entry.id || `${index}`),
          role: entry.role === "assistant" ? "assistant" : "user",
          content: String(entry.content || entry.message || ""),
          createdAt: new Date(entry.createdAt || entry.created_at || Date.now()).getTime(),
        }))
      );
      setField("last_message", nextMessage);
    } catch {
      setMessages((prev) => prev.map((item) => (item.id === optimisticId ? { ...item, optimistic: false } : item)));
    } finally {
      setSending(false);
      setTyping(false);
    }
  }

  return (
    <div
      id="portal-messages"
      style={{
        border: "1px solid #ccc",
        padding: "1rem",
        borderRadius: "8px",
      }}
    >
      <h3>Chat Window</h3>
      <label style={{ display: "inline-flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
        <input
          type="checkbox"
          checked={voiceEnabled}
          onChange={(event) => setVoiceEnabled(event.target.checked)}
        />
        Voice mode ready
      </label>

      <div
        ref={scrollerRef}
        style={{ maxHeight: `calc(60vh - ${keyboardHeight}px)`, overflowY: "auto" }}
        aria-live="polite"
      >
        {sortedMessages.map((message) => (
          <div key={message.id}>
            <strong>{message.role === "user" ? "You" : "Staff"}:</strong>
            <div>{message.content}</div>
          </div>
        ))}
        {typing ? <div style={{ opacity: 0.7 }}>Staff is typing…</div> : null}
      </div>

      <button onClick={() => setEscalated(true)} style={{ marginTop: "0.75rem" }}>
        Talk to a Human
      </button>
      {escalated && <div style={{ color: "red", marginTop: "0.75rem" }}>A specialist has been notified.</div>}

      <div style={{ marginTop: "1rem", paddingBottom: keyboardHeight ? 8 : 0 }}>
        <input
          aria-label="Message input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          style={{ width: "75%" }}
        />
        <button onClick={sendMessage} disabled={sending}>Send</button>
      </div>

      <QualificationSummary />
      {showStartupWaitlist && <StartupWaitlistForm />}
    </div>
  );
}

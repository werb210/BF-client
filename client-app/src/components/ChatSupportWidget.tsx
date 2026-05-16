// @ts-nocheck
import { useEffect, useMemo, useRef, useState } from "react";
import { useApplicationStore } from "@/state/useApplicationStore";
import { useChatSocket } from "@/hooks/useChatSocket";
import { getStoredReadinessSessionId, getStoredReadinessToken } from "@/api/website";

type ChatItem = { id: string; role: "user" | "ai" | "system"; message: string };

function getSessionId(candidate: string | undefined): string | null {
  if (!candidate) return null;
  return candidate.trim() || null;
}

const ANON_CHAT_SESSION_KEY = "boreal_anon_chat_session_id";

function getAnonymousChatSessionId() {
  try {
    const existing = localStorage.getItem(ANON_CHAT_SESSION_KEY);
    if (existing) return existing;
    const created = `anon-${crypto.randomUUID()}`;
    localStorage.setItem(ANON_CHAT_SESSION_KEY, created);
    return created;
  } catch {
    return `anon-${crypto.randomUUID()}`;
  }
}

export default function ChatSupportWidget() {
  const { app } = useApplicationStore();
  const [open, setOpen] = useState(false);
  const [humanActive, setHumanActive] = useState(false);
  const [input, setInput] = useState("");
  const humanActiveRef = useRef(false);
  const [messages, setMessages] = useState<ChatItem[]>([
    { id: crypto.randomUUID(), role: "ai", message: "Hi! I'm Boreal Assistant. How can I help today?" },
  ]);

  const sessionId = useMemo(
    () =>
      getSessionId(app.applicationId) ||
      getSessionId(app.applicationToken) ||
      getSessionId(getStoredReadinessSessionId() || undefined) ||
      getSessionId(app.readinessLeadId) ||
      getSessionId(localStorage.getItem("leadId") || undefined) ||
      getAnonymousChatSessionId(),
    [app.applicationId, app.applicationToken, app.readinessLeadId]
  );
  const readinessToken = useMemo(() => getStoredReadinessToken(), []);
  const userMetadata = useMemo(
    () => ({
      contactEmail: app.applicant.email || null,
      contactPhone: app.applicant.phone || null,
      contactName: [app.applicant.firstName, app.applicant.lastName].filter(Boolean).join(" ") || null,
      companyName: app.kyc.companyName || null,
    }),
    [app.applicant.email, app.applicant.firstName, app.applicant.lastName, app.applicant.phone, app.kyc.companyName]
  );


  useEffect(() => {
    humanActiveRef.current = humanActive;
  }, [humanActive]);

  // BF_CLIENT_BLOCK_BI_ROUND6_CHAT_PROTOCOL_FIX_v1 -- prefer the
  // applicant email as the userId so it stays stable across
  // anonymous-session reconnects within the same applicant; the
  // hook falls back to sessionId when no email is on file.
  const { status, send } = useChatSocket({
    enabled: open,
    sessionId,
    userId: app.applicant.email || null,
    readinessToken,
    userMetadata,
    onHumanActive: () => {
      setHumanActive(true);
      setMessages((prev) => {
        if (prev.some((item) => item.message === "Transferring you…")) {
          return prev;
        }
        return [...prev, { id: crypto.randomUUID(), role: "system", message: "Transferring you…" }];
      });
    },
    onMessage: (message) => {
      if (humanActiveRef.current) return;
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "ai", message }]);
    },
  });

  const handleSend = () => {
    const value = input.trim();
    if (!value || humanActive) return;

    const sent = send(value);
    if (!sent) return;

    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", message: value }]);
    setInput("");
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Open chat"
        className="fixed bottom-6 right-6 z-[70] flex h-14 w-14 items-center justify-center rounded-full bg-brand-bgAlt text-white shadow-xl transition hover:opacity-90"
      >
        <span className="text-2xl">💬</span>
      </button>

      {open && (
        <aside className="fixed bottom-24 right-6 z-[75] flex h-[28rem] w-[22rem] flex-col rounded-lg border border-slate-200 bg-white shadow-2xl">
          <header className="border-b px-4 py-3 text-sm font-semibold">Support Chat</header>
          <div className="flex-1 space-y-2 overflow-y-auto p-3 text-sm">
            {messages.length === 0 && <p className="text-slate-500">How can we help?</p>}
            {messages.map((message) => (
              <p key={message.id} className="leading-relaxed">
                <strong>{message.role}:</strong> {message.message}
              </p>
            ))}
          </div>
          <div className="border-t p-3">
            <p className="mb-2 text-xs text-slate-500">
              {humanActive
                ? "A specialist has joined this chat."
                : status === "connected"
                  ? "Connected"
                  : status === "reconnecting"
                    ? "Reconnecting…"
                    : status === "failed"
                      ? "Chat unavailable right now. Please try again shortly."
                      : "Connecting…"}
            </p>
            <div className="flex gap-2">
              <label htmlFor="chat-support-input" className="sr-only">Type your message</label>
              <input
                id="chat-support-input"
                aria-label="Type your message"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                className="flex-1 rounded border p-2 text-sm"
                placeholder="Type your message"
                disabled={humanActive}
              />
              <button
                type="button"
                className="rounded bg-brand-bgAlt px-3 text-sm text-white disabled:opacity-50"
                onClick={handleSend}
                disabled={humanActive || status !== "connected"}
              >
                Send
              </button>
            </div>
          </div>
        </aside>
      )}
    </>
  );
}

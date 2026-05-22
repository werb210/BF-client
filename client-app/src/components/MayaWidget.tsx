// BF_CLIENT_BLOCK_v318_MAYA_RIP_AND_REPLACE_v1
// Dark Maya widget, ported from BF-Website FloatingChat. Three behaviours:
//   • Chat   → POST /api/maya/message  (proxied to the agent)
//   • Talk   → POST /api/maya/escalate {kind:"talk_to_human"}   (v220/v222 — fires staff SMS)
//   • Report → POST /api/maya/escalate {kind:"report_issue"}    (v220/v222 — fires staff SMS)
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { apiRequest } from "@/lib/api";
import { useApplicationStore } from "@/state/useApplicationStore";
import { useAuth } from "@/auth/useAuth";

type ChatMessage = {
  id: string;
  message: string;
  from: "system" | "user";
};

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

const GREETING =
  "Hi — I'm Maya. How can I help with your application today?";

type AgentReply = { reply?: string; error?: string };

export default function MayaWidget() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"chat" | "report">("chat");
  const [input, setInput] = useState("");
  const [issue, setIssue] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const { user } = (() => {
    try {
      return useAuth();
    } catch {
      return { user: null as Record<string, unknown> | null };
    }
  })();
  const { app } = useApplicationStore();
  const applicationId = app?.applicationId ?? app?.applicationToken ?? null;
  const userPhone =
    typeof (user as any)?.phone === "string" ? ((user as any).phone as string) : null;
  const userEmail =
    typeof (user as any)?.email === "string" ? ((user as any).email as string) : null;
  const sessionId = useMemo(() => uid("client"), []);

  useEffect(() => {
    if (!open || messages.length > 0) return;
    setMessages([{ id: uid("m"), from: "system", message: GREETING }]);
  }, [open, messages.length]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function handleSend(e?: FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setMessages((prev) => [...prev, { id: uid("u"), from: "user", message: text }]);
    setSending(true);
    try {
      const res = (await apiRequest("/api/maya/message", {
        method: "POST",
        headers: { "X-Maya-Audience": "client" },
        body: {
          message: text,
          sessionId,
          application_id: applicationId ?? undefined,
        },
      })) as AgentReply;
      const reply = (res?.reply ?? "").toString().trim() ||
        "I'm here — what would you like to know?";
      setMessages((prev) => [...prev, { id: uid("s"), from: "system", message: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: uid("s"), from: "system", message: "I'm having trouble — try Talk to a Human." },
      ]);
    } finally {
      setSending(false);
    }
  }

  async function requestHumanSupport() {
    setMode("chat");
    setMessages((prev) => [
      ...prev,
      { id: uid("u"), from: "user", message: "[requested live human support]" },
    ]);
    try {
      const summary = messages
        .slice(-6)
        .concat([{ id: "", from: "user", message: "(requested human)" }])
        .map((m) => `${m.from === "user" ? "Client" : "Maya"}: ${m.message}`)
        .join("\n");
      const r = (await apiRequest("/api/maya/escalate", {
        method: "POST",
        body: {
          kind: "talk_to_human",
          message: summary || "Client requested a human.",
          contact: { phone: userPhone, email: userEmail },
          application_id: applicationId ?? undefined,
          conversation_id: conversationId ?? undefined,
        },
      })) as { conversation_id?: string; ok?: boolean };
      if (r?.conversation_id) setConversationId(r.conversation_id);
      setMessages((prev) => [
        ...prev,
        {
          id: uid("s"),
          from: "system",
          message:
            "✓ A Boreal advisor has been notified. They'll reach out via SMS — usually within a few minutes during business hours.",
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: uid("s"),
          from: "system",
          message: "Couldn't reach the team — please email hello@boreal.financial.",
        },
      ]);
    }
  }

  function openReport() {
    setMode("report");
    setIssue("");
  }

  async function submitIssue() {
    const description = issue.trim();
    if (!description) return;
    try {
      await apiRequest("/api/maya/escalate", {
        method: "POST",
        body: {
          kind: "report_issue",
          description,
          page_url: typeof window !== "undefined" ? window.location.href : null,
          contact: { phone: userPhone, email: userEmail },
          application_id: applicationId ?? undefined,
        },
      });
      setMessages((prev) => [
        ...prev,
        { id: uid("s"), from: "system", message: "✓ Thanks — we got your report." },
      ]);
      setIssue("");
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: uid("s"), from: "system", message: "Couldn't submit the issue — please try again." },
      ]);
    }
    setMode("chat");
  }

  const chatUi = <div />;

  if (typeof document === "undefined") return null;
  return createPortal(chatUi, document.body);
}

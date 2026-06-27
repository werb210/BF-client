// BF_CLIENT_BLOCK_v320_MAYA_RIP_AND_REPLACE_v2 — clean port of BF-Website
// FloatingChat (v149 lineage) into the mini-portal. Differences from the
// website version:
//   • No lead-capture gate. The user is already authenticated, so we pull
//     name/email/phone from useAuth() + the application store and pass them
//     with every escalation.
//   • Tailwind classes copied verbatim from FloatingChat so the look is
//     identical across surfaces.
//   • Report an Issue captures a screenshot via html2canvas (same code
//     path as bfw v149) before submitting to /api/maya/escalate
//     (kind: 'report_issue').
//   • Talk to a Human posts kind: 'talk_to_human' with contact info so the
//     BF-Server CRM contact is built/linked immediately. SMS notify of
//     staff is server-side and unchanged.
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { apiRequest } from "@/lib/api";
import { useApplicationStore } from "@/state/useApplicationStore";
import { useAuth } from "@/auth/useAuth";

// BF_CLIENT_MAYA_SCREEN_CONTEXT_v1 — tell Maya which page/step the signed-in
// client is on, so it stops being page-blind. Pairs with the agent foundation
// block that applies screen_context for the client audience (not only staff).
const WIZARD_STEP_LABELS: Record<string, string> = {
  "1": "Financial Profile",
  "2": "Product Selection",
  "3": "Business Details",
  "4": "Applicant Information",
  "5": "Documents",
  "6": "Review & Sign",
};
function buildClientScreenContext(applicationId: string | null): Record<string, unknown> {
  if (typeof window === "undefined") return { surface: "client" };
  const path = window.location.pathname;
  const m = path.match(/step-(\d+)/i);
  const step = m ? m[1] : null;
  const label = step ? WIZARD_STEP_LABELS[step] : null;
  const page = step
    ? `Application wizard \u2014 Step ${step} of 6${label ? ` (${label})` : ""}`
    : path === "/"
      ? "Client landing page"
      : `Client app page: ${path}`;
  return {
    surface: "client",
    path,
    page_url: window.location.href,
    page,
    wizard_step: step ? Number(step) : undefined,
    application_id: applicationId ?? undefined,
  };
}

type ChatMessage = {
  id: string;
  message: string;
  from: "system" | "user";
};

type AgentReply = { reply?: string; error?: string };

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

const GREETING = "Hi — I'm Maya. How can I help?";

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

export default function MayaWidget() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"chat" | "report">("chat");
  const [input, setInput] = useState("");
  const [issue, setIssue] = useState("");
  const [issueShot, setIssueShot] = useState<string | null>(null);
  const [issueShotBusy, setIssueShotBusy] = useState(false);
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
  const userName =
    typeof (user as any)?.name === "string" ? ((user as any).name as string) : null;
  const userPhone =
    typeof (user as any)?.phone === "string" ? ((user as any).phone as string) : null;
  const userEmail =
    typeof (user as any)?.email === "string" ? ((user as any).email as string) : null;
  // BF_CLIENT_BLOCK_v55 — carry the website's Maya session across the click-through.
  const sessionId = useMemo(() => {
    if (typeof window === "undefined") return uid("client");
    try {
      const params = new URLSearchParams(window.location.search);
      const fromUrl = params.get("sessionId") || params.get("readinessSession");
      const KEY = "boreal_maya_session_id";
      const existing = window.localStorage.getItem(KEY);
      const id = fromUrl || existing || uid("client");
      window.localStorage.setItem(KEY, id);
      return id;
    } catch {
      return uid("client");
    }
  }, []);

  useEffect(() => {
    if (!open || messages.length > 0) return;
    setMessages([{ id: uid("m"), from: "system", message: GREETING }]);
  }, [open, messages.length]);

  // BF_CLIENT_BLOCK_v56 — after a human handoff, poll the shared conversation
  // so the client sees staff replies in the same thread (two-way messenger).
  const seenStaffIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!conversationId) return;
    let active = true;
    const poll = async () => {
      try {
        const r = (await apiRequest(`/api/public/conversation/${conversationId}/messages`, {
          method: "GET",
        })) as { messages?: Array<{ id: string; direction: string; body: string }>; data?: { messages?: Array<{ id: string; direction: string; body: string }> } };
        const list = r?.messages ?? r?.data?.messages ?? [];
        if (!active) return;
        const fresh = list.filter((m) => m.direction === "outbound" && !seenStaffIds.current.has(m.id));
        if (fresh.length) {
          fresh.forEach((m) => seenStaffIds.current.add(m.id));
          setMessages((prev) => [...prev, ...fresh.map((m) => ({ id: m.id, from: "system" as const, message: m.body }))]);
        }
      } catch { /* transient — next tick retries */ }
    };
    void poll();
    const timer = setInterval(poll, 4000);
    return () => { active = false; clearInterval(timer); };
  }, [conversationId]);

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
      // BF_CLIENT_BLOCK_v56 — once escalated, post into the shared thread;
      // staff replies arrive via the poll effect below.
      if (conversationId) {
        await apiRequest(`/api/public/conversation/${conversationId}/message`, {
          method: "POST",
          body: { body: text },
        });
      } else {
        const res = (await apiRequest("/api/maya/message", {
          method: "POST",
          headers: { "X-Maya-Audience": "client" },
          body: {
            message: text,
            sessionId,
            application_id: applicationId ?? undefined,
            screen_context: buildClientScreenContext(applicationId),
            // BF_CLIENT_BLOCK_v826_MAYA_KNOWS_CMP_USER — the CMP user is OTP-authenticated, so
            // pass their identity. Maya's prompt only asks for name/email/phone when it has none
            // on file; sending the logged-in phone/email (and contact) stops it interrogating a
            // signed-in client and lets it resolve them by phone.
            phone: userPhone ?? undefined,
            lookupIdentifier: userPhone ?? userEmail ?? undefined,
            contact: { name: userName, phone: userPhone, email: userEmail },
          },
        })) as AgentReply;
        const reply = (res?.reply ?? "").toString().trim() ||
          "I'm here — what would you like to know?";
        setMessages((prev) => [...prev, { id: uid("s"), from: "system", message: reply }]);
      }
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
          contact: { name: userName, phone: userPhone, email: userEmail },
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
        { id: uid("s"), from: "system", message: "Couldn't reach the team — please email hello@boreal.financial." },
      ]);
    }
  }

  async function openReport() {
    setMode("report");
    setIssue("");
    setIssueShot(null);
    setIssueShotBusy(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const target = (document.body.querySelector("main") as HTMLElement) ?? document.body;
      const canvas = await html2canvas(target, {
        useCORS: true,
        backgroundColor: "#0b1226",
        scale: Math.min(window.devicePixelRatio || 1, 2),
        logging: false,
      });
      const MAX_W = 1600;
      let finalCanvas: HTMLCanvasElement = canvas;
      if (canvas.width > MAX_W) {
        const ratio = MAX_W / canvas.width;
        const c2 = document.createElement("canvas");
        c2.width = MAX_W;
        c2.height = Math.round(canvas.height * ratio);
        const ctx = c2.getContext("2d");
        if (ctx) {
          ctx.drawImage(canvas, 0, 0, c2.width, c2.height);
          finalCanvas = c2;
        }
      }
      setIssueShot(finalCanvas.toDataURL("image/jpeg", 0.7));
    } catch (err) {
      console.error("[MayaWidget] screenshot capture failed", err);
      setIssueShot(null);
    } finally {
      setIssueShotBusy(false);
    }
  }

  async function submitIssue() {
    const description = issue.trim();
    if (!description) return;
    const shot = issueShot;
    try {
      await apiRequest("/api/maya/escalate", {
        method: "POST",
        body: {
          kind: "report_issue",
          description,
          page_url: typeof window !== "undefined" ? window.location.href : null,
          // BF_CLIENT_BLOCK_v321_SCREENSHOT_FIELD_FIX_v1 — BF-Server
          // /api/maya/escalate (v645) reads `screenshot_data_url` (with
          // `screenshot` and `screenshot_base64` as aliases). Sending the
          // canonical name keeps wire format obvious for log/debugging.
          screenshot_data_url: shot ?? null,
          contact: { name: userName, phone: userPhone, email: userEmail },
          application_id: applicationId ?? undefined,
        },
      });
      setIssueShot(null);
      setMessages((prev) => [
        ...prev,
        {
          id: uid("s"),
          from: "system",
          message: shot ? "✓ Thanks — we got your report and a screenshot." : "✓ Thanks — we got your report.",
        },
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

  const chatUi = (
    <>
      {open ? (
        <div className="chat-panel fixed inset-0 z-[70] flex h-[100dvh] w-full flex-col overflow-hidden border border-white/20 bg-[#08132a] text-white shadow-2xl pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] md:inset-auto md:bottom-20 md:right-4 md:h-[min(75vh,620px)] md:w-[min(90vw,420px)] md:rounded-2xl md:p-0">
          <div className="chat-header flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Maya</p>
              <p className="text-xs text-slate-300">Boreal Financial Support</p>
            </div>
            <button
              aria-label="Close chat"
              onClick={() => setOpen(false)}
              className="rounded p-1 hover:bg-white/10"
            >
              <CloseIcon />
            </button>
          </div>
          <div ref={scrollRef} className="chat-messages flex-1 space-y-2 overflow-y-auto p-4 text-sm">
            {messages.map((item) => (
              <div
                key={item.id}
                className={`rounded-lg px-3 py-2 ${item.from === "user" ? "ml-8 bg-blue-600 text-white" : "mr-8 bg-[#0f1d3a] text-slate-100"}`}
              >
                {item.message}
              </div>
            ))}
            {sending ? <p className="text-xs text-slate-400">Maya is typing…</p> : null}
          </div>

          {mode === "report" ? (
            <div className="flex flex-col gap-2 border-t border-white/10 px-3 py-2 md:px-4">
              <textarea
                className="w-full rounded border border-white/20 bg-[#0f1d3a] p-2 text-sm text-white"
                rows={3}
                value={issue}
                onChange={(e) => setIssue(e.target.value)}
                placeholder="Describe the issue…"
              />
              <div className="text-xs text-slate-400">
                {issueShotBusy
                  ? "Capturing screenshot…"
                  : issueShot
                  ? "Screenshot attached (will be sent)"
                  : "No screenshot captured — text-only report"}
              </div>
              {issueShot ? (
                <img alt="" src={issueShot} style={{ maxHeight: 80, borderRadius: 4, border: "1px solid rgba(255,255,255,0.15)" }} />
              ) : null}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setMode("chat"); setIssueShot(null); }}
                  className="min-w-0 flex-1 rounded border border-white/20 px-3 py-2 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void submitIssue()}
                  className="flex-1 rounded bg-blue-600 px-3 py-2 text-sm text-white"
                >
                  Submit
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex gap-2 border-t border-white/10 px-3 py-2 md:px-4">
                <button
                  type="button"
                  onClick={() => void requestHumanSupport()}
                  className="min-w-0 flex-1 rounded border border-white/20 px-3 py-2 text-sm"
                >
                  Talk to a Human
                </button>
                <button
                  type="button"
                  onClick={() => void openReport()}
                  className="min-w-0 flex-1 rounded border border-white/20 px-3 py-2 text-sm"
                >
                  Report an Issue
                </button>
              </div>
              <form onSubmit={handleSend} className="flex gap-2 border-t border-white/10 px-3 py-2 md:px-4">
                <input
                  className="min-w-0 flex-1 rounded border border-white/20 bg-[#0f1d3a] px-3 py-2 text-sm text-white placeholder:text-slate-400"
                  placeholder="Type a message…"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={sending || !input.trim()}
                  className="shrink-0 rounded bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-50"
                >
                  Send
                </button>
              </form>
            </>
          )}
        </div>
      ) : null}
      {/* BF_CLIENT_UI_CLUSTER_v1 — the floating button now toggles open AND close. */}
      <button
        type="button"
        aria-label={open ? "Close chat" : "Open chat"}
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-[calc(1rem+env(safe-area-inset-right))] z-[60] flex h-11 w-11 md:h-12 md:w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700"
      >
        {open ? <CloseIcon /> : <ChatIcon />}
      </button>
    </>
  );

  // BF_CLIENT_AUDIT_FIX_v9 -- Maya is redundant on the mini-portal thread (own composer +
  // Talk to a Human + Call Us); hide it there so the floating button never
  // overlaps those controls on mobile.
  const __mayaPath = location.pathname;
  if (__mayaPath === "/portal" || __mayaPath.startsWith("/application/")) return null;
  if (typeof document === "undefined") return null;
  return createPortal(chatUi, document.body);
}

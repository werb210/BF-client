// BF_CLIENT_v802_ONE_THREAD - the phone Chat tab: one full-screen thread for the advisor and Maya.
// A new question goes to Maya first (she answers at once) unless a person on staff wrote in the last
// 24 hours. Every Maya answer has "Send to my advisor", which posts the question into the advisor chat.
// Maya's side of the thread is kept on this device per application; the server keeps its own transcript.
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { apiCall } from "@/api/client";
import { getToken } from "@/auth/token";
import { formatMessageTime } from "@/utils/safeDate";
import { MayaMessage } from "@/components/mayaMarkdown";
import { getOrCreateMayaSessionId } from "@/components/MayaWidget";
import { phoneFromToken } from "@/native/deviceSignIn";
import type { ThreadMessage } from "@/components/messaging/MessageThread";
import { Icon } from "./icons";
import { type Advisor, type MayaEntry, advisorName, defaultRecipient, initials, loadMayaThread, saveMayaThread, SUGGESTED_QUESTIONS } from "./cmpData";
import "./cmp.css";

type Attachment = { name: string; contentType: string; dataUrl: string };

type Props = {
  applicationId: string;
  messages: ThreadMessage[];
  staffTyping: boolean;
  advisor: Advisor | null;
  text: string;
  setText: (v: string) => void;
  recipient: "maya" | "advisor" | null;
  setRecipient: (r: "maya" | "advisor") => void;
  attachments: Attachment[];
  onAttach: (f: File) => void;
  onRemoveAttachment: (i: number) => void;
  /** Posts to the advisor chat (the page's existing send). */
  sendToAdvisor: (body: string, withAttachments: boolean) => Promise<void>;
  onCta: (action: string) => void;
  inputRef: MutableRefObject<HTMLInputElement | null>;
  bodyRef: MutableRefObject<HTMLDivElement | null>;
};

let seq = 0;
const newId = (p: string) => p + "-" + Date.now().toString(36) + "-" + (seq += 1);

export default function CmpChat(p: Props) {
  const [maya, setMaya] = useState<MayaEntry[]>(() => loadMayaThread(p.applicationId));
  const [mayaBusy, setMayaBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const appRef = useRef(p.applicationId);
  useEffect(() => { appRef.current = p.applicationId; setMaya(loadMayaThread(p.applicationId)); }, [p.applicationId]);
  const update = (fn: (cur: MayaEntry[]) => MayaEntry[]) => setMaya((cur) => { const next = fn(cur); saveMayaThread(appRef.current, next); return next; });

  const to = p.recipient ?? defaultRecipient(p.messages);
  const aName = advisorName(p.advisor);
  const advisorLabel = p.advisor?.firstName || "My advisor";

  const timeline = useMemo(() => {
    const staff = p.messages.map((m) => ({ kind: "staff" as const, at: Date.parse(m.createdAt) || 0, m }));
    const ai = maya.map((e) => ({ kind: "maya" as const, at: Date.parse(e.createdAt) || 0, e }));
    return [...staff, ...ai].sort((a, b) => a.at - b.at);
  }, [p.messages, maya]);

  useEffect(() => {
    const el = p.bodyRef.current;
    if (!el) return;
    requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
  }, [timeline.length, mayaBusy, p.staffTyping, p.bodyRef]);

  async function askMaya(question: string) {
    const q = question.trim();
    if (!q) return;
    const now = new Date().toISOString();
    update((cur) => [...cur, { id: newId("c"), from: "client", body: q, createdAt: now }]);
    setMayaBusy(true);
    let reply = "";
    try {
      const token = getToken();
      const phone = token ? phoneFromToken(token) : null;
      const r = await apiCall<{ reply?: string }>("/api/maya/message", {
        method: "POST",
        headers: { "X-Maya-Audience": "client" },
        body: {
          message: q,
          sessionId: getOrCreateMayaSessionId(),
          application_id: p.applicationId,
          screen_context: { surface: "client", page: "Client portal chat (phone)", application_id: p.applicationId },
          phone: phone ?? undefined,
          lookupIdentifier: phone ?? undefined,
        },
      });
      reply = String(r?.reply ?? "").trim();
    } catch {
      reply = "";
    }
    setMayaBusy(false);
    update((cur) => [...cur, {
      id: newId("m"), from: "maya", question: q, createdAt: new Date().toISOString(),
      body: reply || "I couldn't answer that just now. Tap \"Send to my advisor\" and they'll reply here.",
    }]);
  }

  async function send() {
    const body = p.text.trim();
    if ((!body && p.attachments.length === 0) || sending) return;
    setError(null);
    // Attachments always go to the advisor: Maya cannot open files.
    if (to === "maya" && p.attachments.length === 0) { p.setText(""); await askMaya(body); return; }
    setSending(true);
    try { await p.sendToAdvisor(body, true); }
    catch { setError("We couldn't send that. Check your connection and try again."); }
    finally { setSending(false); }
  }

  async function forward(entry: MayaEntry) {
    if (!entry.question || entry.forwarded) return;
    setError(null);
    try {
      await p.sendToAdvisor(entry.question, false);
      update((cur) => cur.map((e) => (e.id === entry.id ? { ...e, forwarded: true } : e)));
    } catch {
      setError("We couldn't send that to your advisor. Try again in a moment.");
    }
  }

  const showSuggestions = !p.text.trim() && to === "maya" && !maya.some((e) => e.from === "client");

  return (
    <section className="cmp-phone-only cmpx-chat" data-cmp-tab="chat" data-testid="cmp-chat" aria-label="Chat">
      <div className="cmpx-chat__who">
        {p.advisor?.photoUrl ? <img className="cmpx-avatar" src={p.advisor.photoUrl} alt="" /> : <span className="cmpx-avatar" aria-hidden="true">{aName ? initials(aName) : "B"}</span>}
        <div>
          <div className="cmpx-chat__whoname">{aName || "Your Boreal team"}</div>
          <div className="cmpx-chat__whosub">Maya, our AI assistant, answers first. Your advisor is one tap away.</div>
        </div>
      </div>
      <div className="cmpx-chat__body" ref={p.bodyRef}>
        {timeline.length === 0 ? (
          <div className="cmpx-chat__empty" data-testid="cmp-chat-empty">Ask anything about your application. Maya answers right away, and you can send any question on to your advisor.</div>
        ) : timeline.map((t) => {
          if (t.kind === "maya") {
            const e = t.e;
            if (e.from === "client") {
              return (
                <div key={e.id} className="cmpx-msg cmpx-msg--me">
                  <div className="cmpx-msg__who">To Maya</div>
                  <div className="cmpx-msg__bubble">{e.body}</div>
                  <div className="cmpx-msg__time">{formatMessageTime(e.createdAt)}</div>
                </div>
              );
            }
            return (
              <div key={e.id} className="cmpx-msg cmpx-msg--maya" data-testid="cmp-maya-reply">
                <div className="cmpx-msg__who">Maya &middot; AI assistant</div>
                <div className="cmpx-msg__bubble"><MayaMessage message={e.body} /></div>
                {e.question ? (e.forwarded
                  ? <div className="cmpx-msg__fwded">Sent to {advisorLabel === "My advisor" ? "your advisor" : advisorLabel}</div>
                  : <button type="button" className="cmpx-msg__fwd" onClick={() => void forward(e)} data-testid="cmp-maya-forward">Send to {advisorLabel === "My advisor" ? "my advisor" : advisorLabel}</button>) : null}
              </div>
            );
          }
          const m = t.m;
          const mine = m.authorRole === "self";
          return (
            <div key={m.id} className={"cmpx-msg " + (mine ? "cmpx-msg--me" : "cmpx-msg--them")}>
              {mine ? null : <div className="cmpx-msg__who">{m.authorName || "Boreal"}</div>}
              <div className="cmpx-msg__bubble">
                {m.body ? <div>{m.body}</div> : null}
                {m.attachments?.map((a, i) => (a.contentType ?? "").startsWith("image/")
                  ? <a key={i} href={a.dataUrl} target="_blank" rel="noreferrer"><img src={a.dataUrl} alt={a.name} style={{ maxWidth: 200, maxHeight: 200, borderRadius: 10, display: "block", marginTop: 6 }} /></a>
                  : <a key={i} href={a.dataUrl} download={a.name} style={{ display: "block", marginTop: 6, color: "inherit" }}>{a.name}</a>)}
                {m.ctaLabel && m.ctaAction ? <button type="button" className="cmpx-msg__cta" onClick={() => p.onCta(String(m.ctaAction))}>{m.ctaLabel}</button> : null}
              </div>
              <div className="cmpx-msg__time">{formatMessageTime(m.createdAt)}{mine && m.seen ? " \u00b7 Seen" : ""}</div>
            </div>
          );
        })}
        {mayaBusy ? <div className="cmpx-chat__typing">Maya is typing...</div> : null}
        {p.staffTyping ? <div className="cmpx-chat__typing">{p.advisor?.firstName || "Your advisor"} is typing...</div> : null}
      </div>
      {showSuggestions ? (
        <div className="cmpx-suggest" role="group" aria-label="Suggested questions" data-testid="cmp-suggestions">
          {SUGGESTED_QUESTIONS.map((q) => <button key={q} type="button" onClick={() => void askMaya(q)}>{q}</button>)}
        </div>
      ) : null}
      <div className="cmpx-composer">
        <div className="cmpx-composer__to" role="group" aria-label="Send to">
          <span>To:</span>
          <button type="button" aria-pressed={to === "maya"} onClick={() => p.setRecipient("maya")} data-testid="cmp-to-maya">Maya (AI)</button>
          <button type="button" aria-pressed={to === "advisor"} onClick={() => p.setRecipient("advisor")} data-testid="cmp-to-advisor">{advisorLabel}</button>
        </div>
        {p.attachments.length > 0 ? (
          <div className="cmpx-chips">
            {p.attachments.map((a, i) => (
              <span key={i}>{a.name}<button type="button" aria-label={"Remove " + a.name} onClick={() => p.onRemoveAttachment(i)} style={{ border: 0, background: "none", cursor: "pointer", padding: 0 }}>&times;</button></span>
            ))}
          </div>
        ) : null}
        {error ? <p className="cmpx-err" role="alert" style={{ margin: "0 4px 6px" }}>{error}</p> : null}
        <div className="cmpx-composer__row">
          <label className="cmpx-composer__attach" title="Attach a file" aria-label="Attach a file">
            <Icon name="clip" />
            <input type="file" style={{ display: "none" }} onChange={(e) => { for (const f of Array.from(e.target.files ?? [])) p.onAttach(f); e.target.value = ""; if (to === "maya") p.setRecipient("advisor"); }} />
          </label>
          <input ref={p.inputRef} className="cmpx-composer__input" data-testid="cmp-chat-input" value={p.text} onChange={(e) => p.setText(e.target.value)}
            placeholder={to === "maya" ? "Ask Maya a question" : "Message " + (p.advisor?.firstName || "your advisor")}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void send(); } }} enterKeyHint="send" />
          <button type="button" className="cmpx-send" aria-label="Send" data-testid="cmp-chat-send" disabled={sending || mayaBusy || (!p.text.trim() && p.attachments.length === 0)} onClick={() => void send()}>
            <Icon name="send" size={20} strokeWidth={2.2} />
          </button>
        </div>
      </div>
    </section>
  );
}

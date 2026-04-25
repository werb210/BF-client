import { useEffect, useRef, useState, type CSSProperties } from "react";
import { submitIssueReport } from "@/api/issues";
import { apiRequest } from "@/lib/api";

type Msg = { role: "user" | "maya"; text: string; ts: number };
const GREETING = "👋 Hi, I'm Maya. How can I help with your application?";

export default function MayaClientChat({ onClose }: { onClose?: () => void }): JSX.Element {
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "maya", text: GREETING, ts: Date.now() },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportText, setReportText] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setMsgs((prev) => [...prev, { role: "user", text, ts: Date.now() }]);
    setSending(true);
    try {
      const response = (await apiRequest("/api/maya/message", {
        method: "POST",
        body: { message: text, source: "client" },
      })) as any;
      const reply = response?.reply ?? "I'm here — what would you like to know?";
      setMsgs((prev) => [...prev, { role: "maya", text: reply, ts: Date.now() }]);
    } catch {
      setMsgs((prev) => [
        ...prev,
        {
          role: "maya",
          text: "I'm having trouble — want me to connect you to a human?",
          ts: Date.now(),
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  async function escalate() {
    try {
      await apiRequest("/api/maya/escalate", {
        method: "POST",
        body: { reason: "user_requested_human" },
      });
      setMsgs((prev) => [
        ...prev,
        { role: "maya", text: "✓ A team member has been notified.", ts: Date.now() },
      ]);
    } catch {
      setMsgs((prev) => [
        ...prev,
        { role: "maya", text: "Couldn't reach the team. Please try again.", ts: Date.now() },
      ]);
    }
  }

  async function report() {
    const message = reportText.trim();
    if (!message) return;
    try {
      await submitIssueReport({ message });
      setReportOpen(false);
      setReportText("");
      setMsgs((prev) => [
        ...prev,
        { role: "maya", text: "✓ Thanks — we got your report.", ts: Date.now() },
      ]);
    } catch {
      setMsgs((prev) => [...prev, { role: "maya", text: "Report failed.", ts: Date.now() }]);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: 90,
        right: 24,
        width: 360,
        height: 520,
        background: "#fff",
        color: "#000",
        borderRadius: 12,
        boxShadow: "0 16px 40px rgba(0,0,0,0.18)",
        display: "flex",
        flexDirection: "column",
        zIndex: 1000,
        border: "1px solid #e2e8f0",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: 12,
          borderBottom: "1px solid #e2e8f0",
          fontWeight: 600,
        }}
      >
        Maya
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontSize: 20,
              color: "#000",
            }}
          >
            ×
          </button>
        )}
      </div>
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 12,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {msgs.map((message) => (
          <div
            key={message.ts}
            style={{
              alignSelf: message.role === "user" ? "flex-end" : "flex-start",
              background: message.role === "user" ? "#2563eb" : "#f1f5f9",
              color: message.role === "user" ? "#fff" : "#000",
              padding: "8px 12px",
              borderRadius: 12,
              maxWidth: "85%",
              whiteSpace: "pre-wrap",
            }}
          >
            {message.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      {reportOpen && (
        <div style={{ padding: 12, borderTop: "1px solid #e2e8f0" }}>
          <textarea
            value={reportText}
            onChange={(event) => setReportText(event.target.value)}
            rows={3}
            placeholder="Describe the issue…"
            style={{
              width: "100%",
              padding: 8,
              color: "#000",
              background: "#fff",
              border: "1px solid #cbd6e2",
              borderRadius: 4,
            }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
              marginTop: 8,
            }}
          >
            <button onClick={() => setReportOpen(false)} style={cancelBtn}>
              Cancel
            </button>
            <button onClick={report} disabled={!reportText.trim()} style={primaryBtn}>
              Send
            </button>
          </div>
        </div>
      )}
      <div style={{ padding: 12, borderTop: "1px solid #e2e8f0" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void send();
              }
            }}
            placeholder="Ask Maya anything…"
            disabled={sending}
            style={{
              flex: 1,
              padding: 8,
              border: "1px solid #cbd6e2",
              borderRadius: 4,
              color: "#000",
              background: "#fff",
            }}
          />
          <button
            onClick={() => {
              void send();
            }}
            disabled={!input.trim() || sending}
            style={primaryBtn}
          >
            Send
          </button>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
            marginTop: 8,
          }}
        >
          <button onClick={escalate} style={ghostBtn}>
            Talk to Human
          </button>
          <button onClick={() => setReportOpen((prev) => !prev)} style={ghostBtnDanger}>
            Report Issue
          </button>
        </div>
      </div>
    </div>
  );
}

const primaryBtn: CSSProperties = {
  background: "#2563eb",
  color: "#fff",
  border: "none",
  padding: "8px 16px",
  borderRadius: 4,
  cursor: "pointer",
};
const cancelBtn: CSSProperties = {
  background: "#fff",
  color: "#000",
  border: "1px solid #cbd6e2",
  padding: "8px 16px",
  borderRadius: 4,
  cursor: "pointer",
};
const ghostBtn: CSSProperties = {
  background: "#fff",
  color: "#2563eb",
  border: "1px solid #2563eb",
  padding: "8px",
  borderRadius: 4,
  cursor: "pointer",
};
const ghostBtnDanger: CSSProperties = {
  background: "#fff",
  color: "#dc2626",
  border: "1px solid #dc2626",
  padding: "8px",
  borderRadius: 4,
  cursor: "pointer",
};

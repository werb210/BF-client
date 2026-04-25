import { useState } from "react";
import { tokens } from "@/styles";
import { submitIssueReport } from "@/api/issues";
import { apiRequest } from "@/lib/api";
import MayaClientChat from "./MayaClientChat";

type View = "closed" | "menu" | "report" | "chat";

export default function MayaFloatingButton() {
  const [view, setView] = useState<View>("closed");
  const [reportText, setReportText] = useState("");
  const [reportSent, setReportSent] = useState(false);
  const [escalated, setEscalated] = useState(false);

  async function handleReport() {
    let screenshot: string | null = null;
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(document.body);
      screenshot = canvas.toDataURL("image/png");
    } catch {
      // fall back to text-only report
    }

    await submitIssueReport({ message: reportText, screenshotBase64: screenshot ?? undefined });
    setReportSent(true);
    setReportText("");
  }

  async function handleTalkToHuman() {
    try {
      await apiRequest("/api/maya/escalate", {
        method: "POST",
        body: JSON.stringify({ reason: "user_requested_human" }),
      });
      setEscalated(true);
    } catch {
      // intentionally silent; user can retry
    }
  }

  if (view === "closed") {
    return (
      <button
        onClick={() => setView("menu")}
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 1000,
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: tokens.colors.primary,
          color: "#fff",
          border: "none",
          cursor: "pointer",
          fontSize: 24,
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
        }}
        aria-label="Open assistant"
      >
        💬
      </button>
    );
  }

  if (view === "chat") {
    return (
      <div
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 1000,
          width: 360,
          maxWidth: "calc(100vw - 32px)",
          height: 520,
          maxHeight: "calc(100vh - 96px)",
          background: "#fff",
          borderRadius: 12,
          boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 12px",
            borderBottom: "1px solid #e5e7eb",
            fontWeight: 600,
          }}
        >
          <span>Maya</span>
          <button
            onClick={() => setView("closed")}
            style={{ background: "transparent", border: "none", fontSize: 18, cursor: "pointer" }}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <MayaClientChat />
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 1000, width: 340, background: "#fff", borderRadius: 16, boxShadow: "0 8px 32px rgba(0,0,0,0.15)", overflow: "hidden" }}>
      <div style={{ background: tokens.colors.primary, color: "#fff", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 600 }}>Boreal Assistant</span>
        <button onClick={() => setView("closed")} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: 18 }}>×</button>
      </div>

      {view === "menu" && (
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            onClick={() => setView("chat")}
            style={{
              display: "block",
              width: "100%",
              padding: 10,
              marginBottom: 8,
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            💬 Chat with Maya
          </button>
          {escalated && (
            <div style={{ marginBottom: 8, padding: 8, background: "rgba(34,197,94,0.12)", color: "#15803d", borderRadius: 6, fontSize: 12 }}>
              A team member has been notified and will reach out shortly.
            </div>
          )}
          <button onClick={() => void handleTalkToHuman()} style={{ padding: "10px 16px", background: "#f0f7ff", color: tokens.colors.primary, border: `1px solid ${tokens.colors.primary}`, borderRadius: 8, cursor: "pointer", textAlign: "left" }}>
            👤 Talk to a Human
          </button>
          <button onClick={() => setView("report")} style={{ padding: "10px 16px", background: "#fff5f5", color: "#dc2626", border: "1px solid #dc2626", borderRadius: 8, cursor: "pointer", textAlign: "left" }}>
            🐛 Report an Issue
          </button>
        </div>
      )}

      {view === "report" && (
        <div style={{ padding: 16 }}>
          <button onClick={() => setView("menu")} style={{ background: "none", border: "none", cursor: "pointer", color: tokens.colors.textSecondary, marginBottom: 8 }}>← Back</button>
          {reportSent ? (
            <p style={{ color: "green" }}>✓ Report sent. We'll look into it.</p>
          ) : (
            <>
              <p style={{ fontSize: 14, color: tokens.colors.textSecondary, marginBottom: 8 }}>Describe what went wrong and we'll take a screenshot automatically.</p>
              <textarea
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
                placeholder="What happened?"
                rows={4}
                style={{ width: "100%", border: "1px solid #e5e7eb", borderRadius: 8, padding: 8, fontSize: 14, boxSizing: "border-box" }}
              />
              <button
                onClick={() => void handleReport()}
                disabled={!reportText.trim()}
                style={{ marginTop: 8, width: "100%", padding: "10px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}
              >
                Send Report
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

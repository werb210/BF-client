import { useState } from "react";
import { tokens } from "@/styles";
import { submitIssueReport } from "@/api/issues";

type View = "closed" | "menu" | "report";

export default function MayaFloatingButton() {
  const [view, setView] = useState<View>("closed");
  const [reportText, setReportText] = useState("");
  const [reportSent, setReportSent] = useState(false);

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
      await fetch("/api/maya/escalate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "user_requested_human" }),
      });
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

  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 1000, width: 340, background: "#fff", borderRadius: 16, boxShadow: "0 8px 32px rgba(0,0,0,0.15)", overflow: "hidden" }}>
      <div style={{ background: tokens.colors.primary, color: "#fff", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 600 }}>Boreal Assistant</span>
        <button onClick={() => setView("closed")} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: 18 }}>×</button>
      </div>

      {view === "menu" && (
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
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

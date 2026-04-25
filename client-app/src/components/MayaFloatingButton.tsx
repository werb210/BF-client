import { useEffect, useRef, useState } from "react";
import { tokens } from "@/styles";
import { submitIssueReport } from "@/api/issues";
import { apiRequest } from "@/lib/api";
import MayaClientChat from "./MayaClientChat";

export default function MayaFloatingButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportText, setReportText] = useState("");
  const [inlineConfirmation, setInlineConfirmation] = useState<string | null>(null);
  const confirmationTimerRef = useRef<number | null>(null);

  const greeting = "Hi, I'm Maya. How can I help you with your application today?";

  useEffect(() => {
    return () => {
      if (confirmationTimerRef.current !== null) {
        window.clearTimeout(confirmationTimerRef.current);
      }
    };
  }, []);

  function showInlineConfirmation(message: string) {
    setInlineConfirmation(message);
    if (confirmationTimerRef.current !== null) {
      window.clearTimeout(confirmationTimerRef.current);
    }
    confirmationTimerRef.current = window.setTimeout(() => {
      setInlineConfirmation(null);
    }, 4000);
  }

  async function handleReport() {
    if (!reportText.trim()) return;

    let screenshot: string | null = null;
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(document.body);
      screenshot = canvas.toDataURL("image/png");
    } catch {
      // fall back to text-only report
    }

    await submitIssueReport({ message: reportText, screenshotBase64: screenshot ?? undefined });
    showInlineConfirmation("✓ Thanks — your report was sent.");
    setReportText("");
    setIsReportOpen(false);
  }

  async function handleTalkToHuman() {
    try {
      await apiRequest("/api/maya/escalate", {
        method: "POST",
        body: JSON.stringify({ reason: "user_requested_human" }),
      });
      showInlineConfirmation("✓ A team member has been notified.");
    } catch {
      // intentionally silent; user can retry
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
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
          onClick={() => setIsOpen(false)}
          style={{ background: "transparent", border: "none", fontSize: 18, cursor: "pointer" }}
          aria-label="Close"
        >
          ×
        </button>
      </div>
      <div style={{ flex: 1, overflow: "hidden" }}>
        <MayaClientChat initialGreeting={greeting} />
      </div>
      <div style={{ borderTop: "1px solid #e5e7eb", padding: 12 }}>
        {inlineConfirmation ? (
          <div
            style={{
              marginBottom: 10,
              padding: "6px 10px",
              borderRadius: 999,
              fontSize: 12,
              color: "#15803d",
              background: "rgba(34, 197, 94, 0.12)",
              display: "inline-block",
            }}
          >
            {inlineConfirmation}
          </div>
        ) : null}
        {isReportOpen ? (
          <div style={{ marginBottom: 10, border: "1px solid #e5e7eb", borderRadius: 8, padding: 10 }}>
            <textarea
              value={reportText}
              onChange={(event) => setReportText(event.target.value)}
              onInput={(event) => setReportText((event.target as HTMLTextAreaElement).value)}
              placeholder="Describe the issue"
              rows={3}
              style={{ width: "100%", border: "1px solid #e5e7eb", borderRadius: 8, padding: 8, fontSize: 14, boxSizing: "border-box", marginBottom: 8 }}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                onClick={() => {
                  setIsReportOpen(false);
                  setReportText("");
                }}
                style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={() => void handleReport()}
                disabled={!reportText.trim()}
                style={{ padding: "8px 12px", borderRadius: 6, border: "none", background: "#dc2626", color: "#fff", cursor: "pointer" }}
              >
                Send Report
              </button>
            </div>
          </div>
        ) : null}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button
            onClick={() => void handleTalkToHuman()}
            style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${tokens.colors.primary}`, background: "#f0f7ff", color: tokens.colors.primary, cursor: "pointer" }}
          >
            Talk to Human
          </button>
          <button
            onClick={() => setIsReportOpen((prev) => !prev)}
            style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #dc2626", background: "#fff5f5", color: "#dc2626", cursor: "pointer" }}
          >
            Report Issue
          </button>
        </div>
      </div>
    </div>
  );
}

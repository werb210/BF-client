// BF_CLIENT_BLOCK_v316_SUBMIT_RETRY_UX_v1 — persistent status banner.
// Renders at the top of the app whenever a submit is pending. Shows
// attempts so the user knows it's actively retrying, plus a "Try now"
// button. Auto-dismisses when the outbox clears.
import { useEffect, useState } from "react";
import {
  subscribeRetry,
  getRetryState,
  triggerImmediateRetry,
  type RetryState,
} from "../state/pendingSubmit";

export default function RetryBanner() {
  const [state, setState] = useState<RetryState>(() => getRetryState());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const unsub = subscribeRetry(() => {
      setState(getRetryState());
    });
    const tick = setInterval(() => setState(getRetryState()), 1000);
    return () => { unsub(); clearInterval(tick); };
  }, []);

  if (!state.pending) return null;

  const onTryNow = async () => {
    setBusy(true);
    try { await triggerImmediateRetry(); } finally { setBusy(false); }
  };

  const sinceLast = state.lastAttemptAt
    ? `${Math.max(1, Math.round((Date.now() - state.lastAttemptAt) / 1000))}s ago`
    : "—";

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: state.inFlight ? "#1d4ed8" : "#0b1320",
        color: "#fff",
        padding: "10px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
        fontSize: 14,
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          aria-hidden="true"
          style={{
            display: "inline-block",
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: state.inFlight ? "#fbbf24" : "#22c55e",
          }}
        />
        <span>
          {state.inFlight
            ? "Submitting your application…"
            : `Submission queued — retrying. Attempts: ${state.attempts}. Last try: ${sinceLast}.`}
        </span>
      </div>
      <button
        type="button"
        onClick={onTryNow}
        disabled={busy || state.inFlight}
        style={{
          background: "transparent",
          border: "1px solid rgba(255,255,255,0.5)",
          color: "#fff",
          padding: "6px 14px",
          borderRadius: 6,
          cursor: (busy || state.inFlight) ? "default" : "pointer",
          opacity: (busy || state.inFlight) ? 0.6 : 1,
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        {busy || state.inFlight ? "Trying…" : "Try now"}
      </button>
    </div>
  );
}

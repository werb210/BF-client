// BF_CLIENT_ACTION_CENTER_v198
// The applicant's home panel: exactly what they still have to do, above
// everything else on the mini-portal.
//
// It renders the server's answer verbatim. It deliberately does NOT re-derive
// "is this done" on the client - that second opinion is what let the chat thread
// and the document picker disagree in the first place.
import { useCallback, useEffect, useState } from "react";
import { apiCall } from "../api/client";

type ActionItem = {
  key: string;
  kind: "document" | "form";
  label: string;
  urgent: boolean;
};

type ActionCenterData = {
  outstanding: ActionItem[];
  completed: ActionItem[];
  outstandingCount: number;
};

type Props = {
  applicationId: string;
  onAction?: (item: ActionItem) => void;
};

const wrap: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  background: "#fff",
  padding: "20px 22px",
  marginBottom: 20,
};

export default function ActionCenter({ applicationId, onAction }: Props) {
  const [data, setData] = useState<ActionCenterData | null>(null);
  const [failed, setFailed] = useState(false);

  // BF_CLIENT_ACTION_CENTER_SHAPE_v206
  // Accept the payload only if it is actually the shape we asked for. Resolving
  // is not the same as being correct.
  const isActionCenter = (d: unknown): d is ActionCenterData =>
    !!d &&
    typeof d === "object" &&
    Array.isArray((d as ActionCenterData).outstanding) &&
    Array.isArray((d as ActionCenterData).completed);

  const load = useCallback(async () => {
    if (!applicationId) return;
    try {
      const d = await apiCall<unknown>(
        `/api/client/documents-needed/action-center?applicationId=${encodeURIComponent(applicationId)}`,
      );
      if (!isActionCenter(d)) {
        setFailed(true);
        return;
      }
      setData(d);
      void import("@/native/appBadge").then((m) => m.setAppBadge(d.outstandingCount)); // BF_CLIENT_BLOCK_v553_APP_BADGE
      setFailed(false);
    } catch {
      // Render nothing on failure so the rest of the portal can carry on.
      setFailed(true);
    }
  }, [applicationId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Re-check when the applicant comes back to the tab, so finishing an upload
  // elsewhere does not leave a stale "still needed" on screen.
  useEffect(() => {
    const onFocus = (): void => void load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  if (failed || !isActionCenter(data)) return null;

  const { outstanding } = data;

  // BF_CLIENT_BLOCK_v562 - nothing to do means nothing to show: no "Completed"
  // list and no "nothing outstanding" banner. The panel exists only for work left.
  if (outstanding.length === 0) return null;

  return (
    <div style={wrap} data-testid="action-center">
      <>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#111827" }}>What you need to do</div>
          <div style={{ fontSize: 14, color: "#6b7280", marginTop: 4, marginBottom: 16 }}>
            {outstanding.length} item{outstanding.length === 1 ? "" : "s"} remaining
          </div>
          {outstanding.map((item, i) => (
            <div
              key={item.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 0",
                borderTop: i === 0 ? "none" : "1px solid #f3f4f6",
              }}
            >
              <span
                style={{
                  width: 24, height: 24, flexShrink: 0, borderRadius: "50%",
                  background: item.urgent ? "#fee2e2" : "#f3f4f6",
                  color: item.urgent ? "#b91c1c" : "#6b7280",
                  fontSize: 12, fontWeight: 600,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                {i + 1}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, color: "#111827" }}>{item.label}</div>
                {item.urgent && (
                  <div style={{ fontSize: 13, color: "#b91c1c", marginTop: 2 }}>
                    Needs re-uploading — the last one was not accepted
                  </div>
                )}
              </div>
              {onAction && (
                <button
                  type="button"
                  onClick={() => onAction(item)}
                  style={{
                    border: "1px solid #0B1F35", background: "#0B1F35", color: "#fff",
                    borderRadius: 8, padding: "8px 16px", fontSize: 14, cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  {item.kind === "document" ? "Upload" : "Review"}
                </button>
              )}
            </div>
          ))}
      </>

    </div>
  );
}

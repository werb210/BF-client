// BF_CLIENT_v807_REPORT - "Report a problem" is its own sheet, not Maya's chat window. It takes a picture of
// the screen the client was on (the sheet itself is left out), they describe what went wrong, and it goes to
// the same place as Maya's "Report an issue" (BF-Server POST /api/maya/escalate, kind report_issue).
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { Sheet } from "./CmpHome";
import "./cmp.css";

export async function captureScreen(skip: (el: Element) => boolean): Promise<string | null> {
  try {
    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(document.body, {
      useCORS: true,
      backgroundColor: "#ffffff",
      scale: Math.min(window.devicePixelRatio || 1, 2),
      logging: false,
      x: window.scrollX,
      y: window.scrollY,
      width: window.innerWidth,
      height: window.innerHeight,
      ignoreElements: skip,
    });
    const MAX_W = 1600;
    let out: HTMLCanvasElement = canvas;
    if (canvas.width > MAX_W) {
      const c2 = document.createElement("canvas");
      c2.width = MAX_W;
      c2.height = Math.round(canvas.height * (MAX_W / canvas.width));
      const ctx = c2.getContext("2d");
      if (ctx) { ctx.drawImage(canvas, 0, 0, c2.width, c2.height); out = c2; }
    }
    return out.toDataURL("image/jpeg", 0.7);
  } catch (err) {
    console.error("[ReportProblemSheet] screenshot failed", err);
    return null;
  }
}

export default function ReportProblemSheet({ applicationId, contact, onClose }: {
  applicationId: string;
  contact: { name: string; phone: string; email: string };
  onClose: () => void;
}) {
  const [shot, setShot] = useState<string | null>(null);
  const [shotBusy, setShotBusy] = useState(true);
  const [includeShot, setIncludeShot] = useState(true);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    let alive = true;
    void captureScreen((el) => el instanceof HTMLElement && el.dataset.reportSheet === "1").then((s) => {
      if (!alive) return;
      setShot(s);
      setShotBusy(false);
    });
    return () => { alive = false; };
  }, []);

  const send = async () => {
    const description = text.trim();
    if (!description) { setErr("Tell us what went wrong."); return; }
    setBusy(true);
    setErr(null);
    try {
      await apiRequest("/api/maya/escalate", {
        method: "POST",
        body: {
          kind: "report_issue",
          description,
          page_url: typeof window !== "undefined" ? window.location.href : null,
          screenshot_data_url: includeShot ? shot : null,
          contact,
          application_id: applicationId || undefined,
        },
      });
      setSent(true);
    } catch {
      setErr("We couldn't send that. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-report-sheet="1">
      <Sheet title="Report a problem" onClose={onClose} testId="cmp-report-sheet">
        {sent ? (
          <div data-testid="cmp-report-sent">
            <p style={{ fontSize: 17, fontWeight: 700, color: "#0B1F3A", margin: "4px 0 6px" }}>Thanks, we got your report.</p>
            <p className="cmpx-muted" style={{ margin: "0 0 16px" }}>Our team will look into it. If we need more detail, your advisor will message you.</p>
            <button type="button" className="cmpx-btn cmpx-btn--block" onClick={onClose}>Done</button>
          </div>
        ) : (
          <>
            <label className="cmpx-field">What went wrong?
              <textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} data-testid="cmp-report-text"
                placeholder="For example: the Upload button did nothing on the Home screen." />
            </label>
            <div className="cmpx-report__shot">
              {shotBusy ? <p className="cmpx-muted" style={{ margin: 0 }}>Taking a picture of your screen...</p>
                : shot ? (
                  <label className="cmpx-report__shotlabel">
                    <input type="checkbox" checked={includeShot} onChange={(e) => setIncludeShot(e.target.checked)} data-testid="cmp-report-include-shot" />
                    <span>Include this picture of your screen</span>
                    <img src={shot} alt="Your screen" className="cmpx-report__img" />
                  </label>
                ) : null}
            </div>
            {err ? <p className="cmpx-err" role="alert">{err}</p> : null}
            <button type="button" className="cmpx-btn cmpx-btn--block" onClick={() => void send()} disabled={busy || shotBusy} data-testid="cmp-report-send">
              {busy ? "Sending..." : "Send report"}
            </button>
          </>
        )}
      </Sheet>
    </div>
  );
}

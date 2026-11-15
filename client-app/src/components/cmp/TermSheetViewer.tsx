// BF_CLIENT_v957_OFFER_IN_APP - the term sheet and its signing open inside the client portal, never in another
// browser window. A PDF is drawn page by page (an iPhone shows only the first page of a PDF placed in a frame); a Word
// term sheet arrives from the server as a plain page and is shown in a locked-down frame; signing is SignNow's page in
// a frame, the same way the application documents are signed.
import { useEffect, useRef, useState } from "react";

export type OfferFrame =
  | { kind: "sign"; title: string; url: string }
  | { kind: "pdf"; title: string; data: ArrayBuffer }
  | { kind: "page"; title: string; html: string }
  | { kind: "loading"; title: string }
  | { kind: "error"; title: string; text: string };

/** Sorts what the server sent into something the viewer can show. */
export async function frameFromResponse(res: Response, title: string): Promise<OfferFrame> {
  const type = (res.headers.get("content-type") ?? "").toLowerCase();
  if (type.includes("text/html")) return { kind: "page", title, html: await res.text() };
  const data = await res.arrayBuffer();
  const head = new TextDecoder("latin1").decode(new Uint8Array(data.slice(0, 5)));
  if (type.includes("application/pdf") || head === "%PDF-") return { kind: "pdf", title, data };
  return { kind: "error", title, text: "This term sheet cannot be shown here. Please message your advisor." };
}

function PdfPages({ data }: { data: ArrayBuffer }) {
  const host = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => {
    let cancelled = false;
    let task: { destroy?: () => unknown } | null = null;
    void (async () => {
      try {
        const pdfjs: any = await import("pdfjs-dist/legacy/build/pdf.mjs");
        const worker: any = await import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url");
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
        const loading = pdfjs.getDocument({ data: new Uint8Array(data.slice(0)) });
        task = loading;
        const doc = await loading.promise;
        const el = host.current;
        if (cancelled || !el) return;
        el.replaceChildren();
        const width = Math.max(280, el.clientWidth - 2);
        const ratio = Math.min(2, window.devicePixelRatio || 1);
        for (let n = 1; n <= doc.numPages; n += 1) {
          const page = await doc.getPage(n);
          if (cancelled) return;
          const base = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: (width / base.width) * ratio });
          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.style.width = "100%";
          canvas.style.display = "block";
          canvas.style.marginBottom = "8px";
          canvas.style.background = "#fff";
          canvas.setAttribute("aria-label", `Page ${n} of ${doc.numPages}`);
          el.appendChild(canvas);
          await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
        }
        if (!cancelled) setState("ready");
      } catch {
        if (!cancelled) setState("error");
      }
    })();
    return () => { cancelled = true; try { void task?.destroy?.(); } catch { /* already gone */ } };
  }, [data]);
  return (
    <div style={{ height: "100%", overflow: "auto", background: "#E4EAF2", padding: 8, WebkitOverflowScrolling: "touch" }}>
      {state === "loading" ? <div style={{ padding: 16 }}>Opening the term sheet…</div> : null}
      {state === "error" ? <div style={{ padding: 16 }} role="alert">The term sheet could not be opened. Please message your advisor.</div> : null}
      <div ref={host} data-testid="term-sheet-pages" />
    </div>
  );
}

export default function TermSheetViewer({ frame, onClose }: { frame: OfferFrame; onClose: () => void }) {
  return (
    <div role="dialog" aria-modal="true" aria-label={frame.title} data-testid="offer-frame"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, padding: "calc(env(safe-area-inset-top) + 8px) 8px calc(env(safe-area-inset-bottom) + 8px)" }}>
      <div style={{ background: "#fff", color: "#0b1320", borderRadius: 12, maxWidth: 900, width: "100%", height: "100%", maxHeight: "92vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 10px 40px rgba(0,0,0,0.4)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid #e5e7eb" }}>
          <div style={{ fontSize: 18, fontWeight: 600 }}>{frame.title}</div>
          <button type="button" onClick={onClose} data-testid="offer-frame-close" style={{ background: "#0B1F3A", color: "#fff", border: 0, borderRadius: 10, minHeight: 40, padding: "8px 16px", fontWeight: 600, cursor: "pointer" }}>Done</button>
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          {frame.kind === "loading" ? <div style={{ padding: 24 }}>Opening…</div> : null}
          {frame.kind === "error" ? <div style={{ padding: 24 }} role="alert">{frame.text}</div> : null}
          {frame.kind === "sign" ? <iframe title={frame.title} src={frame.url} data-testid="offer-sign-frame" style={{ border: 0, width: "100%", height: "100%" }} /> : null}
          {frame.kind === "page" ? <iframe title={frame.title} srcDoc={frame.html} sandbox="" data-testid="term-sheet-page" style={{ border: 0, width: "100%", height: "100%" }} /> : null}
          {frame.kind === "pdf" ? <PdfPages data={frame.data} /> : null}
        </div>
      </div>
    </div>
  );
}

// BF_CLIENT_BLOCK_53_v1 -- mini-portal DocPicker modal.
// Replaces the wall of per-doc upload cards added in Block 44 EDIT 2.
// Opens from the "Upload Documents" pill in the right rail. Lists
// only docs the client still needs: rejected re-uploads and required
// docs that are missing or skipped.
import { useEffect, useState } from "react";
import { apiCall } from "@/api/client";
import { ENV } from "@/env";
import { getToken } from "@/auth/token";
import { enqueueUploadFromFile, isRetryableUploadFailure } from "@/lib/uploadQueue"; // BF_CLIENT_UPLOAD_QUEUE_v278
import { queuedMessage, reportUploadFailure } from "@/lib/docUpload"; // BF_CLIENT_DIRECT_UPLOAD_v730
import { Capacitor } from "@capacitor/core"; // BF_CLIENT_DOCPICKER_SCAN_v634
import { scanDocumentAsPdfWithQuality } from "@/native/documentScanner"; // BF_CLIENT_DOCPICKER_SCAN_v634
import { A11Y_COLORS } from "@/styles/a11yColors"; // BF_CLIENT_v789_CONTRAST
import "@/components/cmp/cmp.css"; // BF_CLIENT_v805_PHONE_FIXES - .dp-row / .dp-actions phone layout

type DocItem = { document_type: string; label: string };
import { trackUsage } from "@/lib/appUsage"; // BF_CLIENT_v811_APP_USAGE
type NeededResponse = { stillNeeded: DocItem[]; rejected: DocItem[] };
// BF_CLIENT_v841_OTHER_DOC - a row for documents we did not ask for but the client thinks help.
// "other" is already an allowed client upload type on the server (no OCR), the same one Step 5 uses.
export const OTHER_DOC_TYPE = "other";

interface Props {
  applicationId: string;
  onClose: () => void;
  onUploaded?: () => void;
  // BF_CLIENT_STAGE2_UPLOADS_v205 - when the picker is opened from a specific
  // Stage 2 row, upload against THAT requirement rather than making the client
  // find it again in a list. The list here is built from documents-needed, which
  // reads document_requirements; the Stage 2 rows come from the product's
  // required_documents JSON. Those two sets do not always agree, so an aimed
  // open must not depend on the row appearing in the fetched list.
  documentType?: string;
  documentLabel?: string;
}

export default function DocPicker({ applicationId, onClose, onUploaded, documentType, documentLabel }: Props) {
  const [notice, setNotice] = useState<string | null>(null); // BF_CLIENT_UPLOAD_QUEUE_v278
  const [data, setData] = useState<NeededResponse>({ stillNeeded: [], rejected: [] });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const aimedAt = documentType ?? null; // BF_CLIENT_DIRECT_UPLOAD_v730

  useEffect(() => {
    let active = true;
    // BF_CLIENT_STAGE2_UPLOADS_v205 - an aimed open needs no list at all. Going
    // to the network for one anyway means a slow or failing documents-needed
    // call blocks an upload that does not depend on it.
    if (documentType) {
      setData({ stillNeeded: [{ document_type: documentType, label: documentLabel || documentType }], rejected: [] });
      setLoading(false);
      return () => { active = false; };
    }
    apiCall<NeededResponse>(`/api/client/documents-needed/needed?applicationId=${encodeURIComponent(applicationId)}`)
      .then((d) => { if (active) setData(d); })
      .catch(() => { if (active) setError("We couldn't load your document list. Check your connection and try again."); }) // BF_CLIENT_NO_FALSE_ALL_CLEAR_v728
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [applicationId, documentType, documentLabel]);

  async function pickAndUpload(documentType: string) {
    // BF_CLIENT_DOCPICKER_MULTIFILE_v1 -- accept multiple files per requirement.
    // Applicants can select several files at once (e.g. all 6 bank statements);
    // each is uploaded sequentially against the same category. The still-needed
    // list is cleared only after EVERY selected file succeeds. On any failure the
    // item stays so the client can retry. (Count-aware "stay until N of N" is a
    // separate server change and is intentionally not handled here.)
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.onchange = () => { void uploadFiles(documentType, Array.from(input.files ?? [])); };
    input.click();
  }

  // BF_CLIENT_DOCPICKER_SCAN_v634 - the phone's document scanner (already used in Step 5 of the
  // application) now also works here: scan the pages, they are turned into one PDF and uploaded.
  async function scanAndUpload(documentType: string, label: string) {
    try {
      const { file, quality } = await scanDocumentAsPdfWithQuality(label || documentType);
      if (file) await uploadFiles(documentType, [file]);
      // After the upload, which clears earlier notices: the scan went through, but say if it looks unreadable.
      if (file && quality && !quality.ok) setNotice((prev) => (prev ? prev + " " : "") + quality.message);
    } catch {
      // Cancelled, or the scanner is unavailable - nothing to do.
    }
  }

  async function uploadFiles(documentType: string, files: File[]) {
    {
      if (files.length === 0) return;
      setUploading(documentType);
      setError(null);
      let lastResp: Response | undefined;
      let failed = false;
      let queued = 0; // BF_CLIENT_UPLOAD_QUEUE_v278
      setNotice(null);
      for (const file of files) {
        if (queued > 0) {
          // Already offline: save the rest on the device instead of trying each one.
          try { await enqueueUploadFromFile({ applicationToken: "", applicationId, documentType, file, mode: "session" }); queued += 1; continue; }
          catch { failed = true; break; }
        }
        const form = new FormData();
        form.append("file", file);
        // The live server /upload reads the `category` field; send both names so
        // it works against the current server and any future build.
        form.append("category", documentType);
        form.append("document_type", documentType);
        form.append("applicationId", applicationId);
        try {
          lastResp = await fetch(`${ENV.API_BASE}/api/client/documents/upload`, {
            method: "POST",
            headers: { Authorization: `Bearer ${getToken() ?? ""}` },
            body: form,
          });
          if (!lastResp.ok) throw new Error(String(lastResp.status));
          trackUsage("document_uploaded"); // BF_CLIENT_v811_APP_USAGE
        } catch (err) {
          const status = lastResp && !lastResp.ok ? lastResp.status : undefined;
          // BF_CLIENT_DIRECT_UPLOAD_v730 - send the browser's own error to the server log.
          reportUploadFailure({ applicationId, documentType, attempt: "picker", status: status ?? null, errorName: err instanceof Error ? err.name : typeof err,
            errorMessage: err instanceof Error ? err.message : String(err), sizeBytes: file.size, contentType: file.type || null });
          if (isRetryableUploadFailure(status, status === undefined ? err : undefined)) {
            try {
              await enqueueUploadFromFile({ applicationToken: "", applicationId, documentType, file, mode: "session" });
              queued += 1;
              continue;
            } catch { /* fall through to the error message */ }
          }
          failed = true;
          const detail = err instanceof Error ? err.message : "";
          console.error("[DocPicker upload] failed:", detail, lastResp?.status, lastResp?.statusText);
          break;
        }
      }
      if (failed) {
        const userMessage =
          lastResp?.status === 401 ? "Session expired. Please sign in again."
          : lastResp?.status === 413 ? "That file is too large. Please use a smaller file (under 25 MB)."
          : lastResp?.status === 415 ? "That file type is not supported. Please upload a PDF, Word document, Excel file, or a photo (PNG/JPEG/HEIC)." // BF_CLIENT_STEP5_PERMANENT_4XX_v1
          : "Upload failed. Please try again.";
        setError(userMessage);
        setUploading(null);
        return;
      }
      if (queued > 0) {
        setNotice(queuedMessage(queued)); // BF_CLIENT_DIRECT_UPLOAD_v730 - only says "No connection" when offline
        setUploading(null);
        return;
      }
      onUploaded?.();
      // BF_CLIENT_v841_OTHER_DOC - an extra document never clears a list; say it arrived and stay open.
      if (documentType === OTHER_DOC_TYPE && !aimedAt) {
        setNotice(files.length === 1 ? "Thanks — your document was added. Your advisor will see it." : `Thanks — ${files.length} documents were added. Your advisor will see them.`);
        setUploading(null);
        return;
      }
      // BF_CLIENT_DIRECT_UPLOAD_v730 - opened for one item, the list held only that item, so emptying it
      // showed "You're all caught up" while other items were still outstanding. Close instead.
      if (aimedAt) { setUploading(null); onClose(); return; }
      // All selected files uploaded: remove this doc type from both lists.
      setData((cur) => ({
        stillNeeded: cur.stillNeeded.filter((d) => d.document_type !== documentType),
        rejected: cur.rejected.filter((d) => d.document_type !== documentType),
      }));
      setUploading(null);
    }
  }

  // BF_CLIENT_v802_SCAN_FIRST - in the phone and tablet apps "Scan to PDF" (the camera finds the page edges,
  // crops, and joins the pages into one PDF) is the main button; choosing a file is the second.
  const fileBtnPrimary: React.CSSProperties = { minHeight: 40, padding: "6px 14px", border: 0, borderRadius: 8, background: "#0B1F3A", color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600 };
  // BF_CLIENT_v805_PHONE_FIXES - Scan to PDF and Choose file are two equal navy buttons under the document name.
  const empty = !loading && !error && data.stillNeeded.length === 0 && data.rejected.length === 0; // BF_CLIENT_NO_FALSE_ALL_CLEAR_v728

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 12, width: "100%", maxWidth: 520, maxHeight: "85vh", overflow: "auto", padding: 24 }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Upload Documents</h2>
          <button type="button" onClick={onClose} aria-label="Close" style={{ border: 0, background: "transparent", fontSize: 24, cursor: "pointer", color: "#64748b" }}>×</button>
        </div>

        {loading && <p style={{ color: "#64748b" }}>Loading…</p>}
        {error && <p style={{ color: "#b91c1c" }}>{error} <button type="button" onClick={() => window.location.reload()} style={{ marginLeft: 6, border: "1px solid #b91c1c", background: "#fff", color: "#b91c1c", borderRadius: 6, padding: "2px 10px", cursor: "pointer" }}>Try again</button></p>}
        {notice && <p data-testid="docpicker-queued-notice" style={{ color: "#1e40af" }}>{notice}</p>}
        {empty && (
          <p style={{ color: A11Y_COLORS.successText }}>You're all caught up — no documents needed right now.</p>
        )}

        {data.rejected.length > 0 && (
          <section style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#b91c1c", margin: "12px 0 8px" }}>Re-upload rejected</h3>
            {data.rejected.map((d) => (
              <div key={`r-${d.document_type}`} className="dp-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                <span style={{ fontSize: 14 }}>{d.label}</span>
                <span className="dp-actions" style={{ display: "flex", gap: 8 }}>
                  {Capacitor.isNativePlatform() && (
                    <button type="button" onClick={() => void scanAndUpload(d.document_type, d.label)} disabled={uploading === d.document_type} data-testid="docpicker-scan" style={{ minHeight: 40, padding: "6px 14px", border: 0, borderRadius: 8, background: "#0B1F3A", color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
                      Scan to PDF
                    </button>
                  )}
                  <button type="button" onClick={() => pickAndUpload(d.document_type)} disabled={uploading === d.document_type} style={fileBtnPrimary}>
                    {uploading === d.document_type ? "Uploading…" : Capacitor.isNativePlatform() ? "Choose file" : "Re-upload"}
                  </button>
                </span>
              </div>
            ))}
          </section>
        )}

        {data.stillNeeded.length > 0 && (
          <section>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: "12px 0 8px" }}>Still needed</h3>
            {data.stillNeeded.map((d) => (
              <div key={`n-${d.document_type}`} className="dp-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                <span style={{ fontSize: 14 }}>{d.label}</span>
                <span className="dp-actions" style={{ display: "flex", gap: 8 }}>
                  {Capacitor.isNativePlatform() && (
                    <button type="button" onClick={() => void scanAndUpload(d.document_type, d.label)} disabled={uploading === d.document_type} data-testid="docpicker-scan" style={{ minHeight: 40, padding: "6px 14px", border: 0, borderRadius: 8, background: "#0B1F3A", color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
                      Scan to PDF
                    </button>
                  )}
                  <button type="button" onClick={() => pickAndUpload(d.document_type)} disabled={uploading === d.document_type} style={fileBtnPrimary}>
                    {uploading === d.document_type ? "Uploading…" : Capacitor.isNativePlatform() ? "Choose file" : "Upload"}
                  </button>
                </span>
              </div>
            ))}
          </section>
        )}

        {/* BF_CLIENT_v841_OTHER_DOC - always offered (not when opened for one specific item). */}
        {!aimedAt && !loading && (
          <section data-testid="docpicker-other" style={{ marginTop: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: "12px 0 4px" }}>Anything else?</h3>
            <div className="dp-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
              <span style={{ fontSize: 14 }}>
                Other document (optional)
                <span style={{ display: "block", fontSize: 13, color: "#475569" }}>Anything you think will help, even if we didn't ask for it.</span>
              </span>
              <span className="dp-actions" style={{ display: "flex", gap: 8 }}>
                {Capacitor.isNativePlatform() && (
                  <button type="button" onClick={() => void scanAndUpload(OTHER_DOC_TYPE, "Other document")} disabled={uploading === OTHER_DOC_TYPE} data-testid="docpicker-other-scan" style={fileBtnPrimary}>
                    Scan to PDF
                  </button>
                )}
                <button type="button" onClick={() => pickAndUpload(OTHER_DOC_TYPE)} disabled={uploading === OTHER_DOC_TYPE} data-testid="docpicker-other-upload" style={fileBtnPrimary}>
                  {uploading === OTHER_DOC_TYPE ? "Uploading…" : Capacitor.isNativePlatform() ? "Choose file" : "Add file"}
                </button>
              </span>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

// BF_CLIENT_BLOCK_53_v1 -- mini-portal DocPicker modal.
// Replaces the wall of per-doc upload cards added in Block 44 EDIT 2.
// Opens from the "Upload Documents" pill in the right rail. Lists
// only docs the client still needs: rejected re-uploads and required
// docs that are missing or skipped.
import { useEffect, useState } from "react";
import { apiCall } from "@/api/client";
import { ENV } from "@/env";
import { getToken } from "@/auth/token";

type DocItem = { document_type: string; label: string };
type NeededResponse = { stillNeeded: DocItem[]; rejected: DocItem[] };

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
  const [data, setData] = useState<NeededResponse>({ stillNeeded: [], rejected: [] });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      .catch(() => { if (active) setError("Couldn't load required documents."); })
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
    input.onchange = async () => {
      const files = Array.from(input.files ?? []);
      if (files.length === 0) return;
      setUploading(documentType);
      setError(null);
      let lastResp: Response | undefined;
      let failed = false;
      for (const file of files) {
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
        } catch (err) {
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
      onUploaded?.();
      // All selected files uploaded: remove this doc type from both lists.
      setData((cur) => ({
        stillNeeded: cur.stillNeeded.filter((d) => d.document_type !== documentType),
        rejected: cur.rejected.filter((d) => d.document_type !== documentType),
      }));
      setUploading(null);
    };
    input.click();
  }

  const empty = !loading && data.stillNeeded.length === 0 && data.rejected.length === 0;

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
        {error && <p style={{ color: "#b91c1c" }}>{error}</p>}
        {empty && (
          <p style={{ color: "#16a34a" }}>You're all caught up — no documents needed right now.</p>
        )}

        {data.rejected.length > 0 && (
          <section style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#b91c1c", margin: "12px 0 8px" }}>Re-upload rejected</h3>
            {data.rejected.map((d) => (
              <div key={`r-${d.document_type}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                <span style={{ fontSize: 14 }}>{d.label}</span>
                <button type="button" onClick={() => pickAndUpload(d.document_type)} disabled={uploading === d.document_type} style={{ padding: "6px 14px", border: 0, borderRadius: 6, background: "#3b82f6", color: "#fff", cursor: "pointer", fontSize: 13 }}>
                  {uploading === d.document_type ? "Uploading…" : "Re-upload"}
                </button>
              </div>
            ))}
          </section>
        )}

        {data.stillNeeded.length > 0 && (
          <section>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: "12px 0 8px" }}>Still needed</h3>
            {data.stillNeeded.map((d) => (
              <div key={`n-${d.document_type}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                <span style={{ fontSize: 14 }}>{d.label}</span>
                <button type="button" onClick={() => pickAndUpload(d.document_type)} disabled={uploading === d.document_type} style={{ padding: "6px 14px", border: 0, borderRadius: 6, background: "#3b82f6", color: "#fff", cursor: "pointer", fontSize: 13 }}>
                  {uploading === d.document_type ? "Uploading…" : "Upload"}
                </button>
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}

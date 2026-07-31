// BF_CLIENT_ACCOUNTANT_PORTAL_v1
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import {
  clearAccountantToken, fetchAccountantApplication, fetchAccountantMe, getAccountantToken,
  startAccountantOtp, uploadAccountantDocument, verifyAccountantOtp,
  type AccountantApplication, type AccountantUploadSlot,
} from "@/api/accountant";

function toE164(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return raw.trim();
}

function getError(error: unknown): Error & { status?: number } {
  return error instanceof Error ? error : new Error(String(error));
}

function signInMessage(error: unknown): string {
  const err = getError(error);
  if (err.message === "no_accountant_for_phone") return "We don't have this number on file as an accountant. Check with your client that they gave us this number.";
  if (err.message === "ambiguous_accountant_phone") return "This number is recorded for more than one firm. Please contact Boreal so we can correct it.";
  if (err.status === 401) return "That code was wrong or has expired. Request a new one.";
  return "Something went wrong signing you in. Please try again.";
}

const wrap: CSSProperties = { maxWidth: 560, margin: "0 auto", padding: 20 };
const card: CSSProperties = { border: "1px solid #cbd5e1", borderRadius: 12, padding: 16, marginBottom: 12, background: "#fff" };
const input: CSSProperties = { width: "100%", padding: "10px 12px", fontSize: 16, borderRadius: 8, border: "1px solid #cbd5e1", boxSizing: "border-box" };
const button: CSSProperties = { padding: "10px 16px", fontSize: 15, fontWeight: 600, borderRadius: 8, border: "none", background: "#1d4ed8", color: "#fff", cursor: "pointer" };
const link: CSSProperties = { background: "none", border: "none", color: "#1d4ed8", cursor: "pointer", padding: 0, fontSize: 14 };

export default function AccountantPage() {
  const [signedIn, setSignedIn] = useState(Boolean(getAccountantToken()));
  const [phase, setPhase] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [applications, setApplications] = useState<AccountantApplication[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [uploads, setUploads] = useState<AccountantUploadSlot[]>([]);
  const [uploadingCategory, setUploadingCategory] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadMe = useCallback(async () => {
    try {
      const me = await fetchAccountantMe();
      setName(me.accountant?.name ?? null);
      setApplications(me.applications ?? []);
      setSignedIn(true);
    } catch (error) {
      if (getError(error).status === 401) { clearAccountantToken(); setSignedIn(false); }
      else setError("We couldn't load your client's applications. Please try again.");
    }
  }, []);

  useEffect(() => { if (signedIn) void loadMe(); }, [signedIn, loadMe]);

  async function openApplication(id: string) {
    if (id === openId) { setOpenId(null); setUploads([]); return; }
    setOpenId(id); setNotice(null); setError(null);
    try { const detail = await fetchAccountantApplication(id); setUploads(detail.uploads ?? []); }
    catch { setOpenId(null); setError("We couldn't open that application."); }
  }

  async function handleUpload(category: string, file: File) {
    if (!openId) return;
    setUploadingCategory(category); setError(null);
    try {
      await uploadAccountantDocument(openId, category, file);
      setNotice(`${category} received. Thank you.`);
      const detail = await fetchAccountantApplication(openId);
      setUploads(detail.uploads ?? []);
    } catch (error) {
      const code = getError(error).message;
      if (code === "UNSUPPORTED_FILE_TYPE") setError("That file type isn't accepted. PDF, images, Word and Excel work.");
      else if (code === "APPLICATION_NOT_ACCEPTING_UPLOADS") setError("This application is closed and no longer accepts documents.");
      else setError("The upload didn't go through. Please try again.");
    } finally { setUploadingCategory(null); }
  }

  if (!signedIn) return (
    <div style={wrap}>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>Accountant sign-in</h1>
      <p style={{ color: "#475569", fontSize: 14, marginTop: 0 }}>Use the mobile number your client gave us. We'll text you a code.</p>
      <div style={card}>
        {phase === "phone" ? <>
          <label htmlFor="accountant-phone" style={{ fontSize: 13 }}>Mobile number</label>
          <input id="accountant-phone" type="tel" name="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} style={{ ...input, marginTop: 4, marginBottom: 12 }} />
          <button type="button" style={button} disabled={busy || !phone.trim()} onClick={async () => {
            setBusy(true); setError(null);
            try { await startAccountantOtp(toE164(phone)); setPhase("code"); }
            catch { setError("We couldn't send the code. Check the number and try again."); }
            finally { setBusy(false); }
          }}>{busy ? "Sending…" : "Send code"}</button>
        </> : <>
          <label htmlFor="accountant-code" style={{ fontSize: 13 }}>6-digit code</label>
          <input id="accountant-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value)} style={{ ...input, marginTop: 4, marginBottom: 12 }} />
          <button type="button" style={button} disabled={busy || code.trim().length < 6} onClick={async () => {
            setBusy(true); setError(null);
            try { await verifyAccountantOtp(toE164(phone), code.trim()); setSignedIn(true); }
            catch (error) { setError(signInMessage(error)); }
            finally { setBusy(false); }
          }}>{busy ? "Checking…" : "Sign in"}</button>
          <div style={{ marginTop: 10 }}><button type="button" style={link} onClick={() => { setPhase("phone"); setCode(""); setError(null); }}>Use a different number</button></div>
        </>}
        {error && <div role="alert" style={{ color: "#b91c1c", fontSize: 13, marginTop: 10 }}>{error}</div>}
      </div>
    </div>
  );

  return <div style={wrap}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
      <h1 style={{ fontSize: 22 }}>{name ? `Hello, ${name}` : "Documents"}</h1>
      <button type="button" style={link} onClick={() => { clearAccountantToken(); setSignedIn(false); setPhase("phone"); setCode(""); setOpenId(null); }}>Sign out</button>
    </div>
    {error && <div role="alert" style={{ color: "#b91c1c", fontSize: 13, marginBottom: 10 }}>{error}</div>}
    {notice && <div role="status" style={{ color: "#15803d", fontSize: 13, marginBottom: 10 }}>{notice}</div>}
    {applications.length === 0 ? <div style={card}>Nothing is waiting on you right now.</div> : applications.map((app) => <div key={app.id} style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong>{app.business_name || "Application"}</strong>
        <button type="button" style={link} aria-expanded={openId === app.id} onClick={() => void openApplication(app.id)}>{openId === app.id ? "Hide" : "Open"}</button>
      </div>
      {openId === app.id && <div style={{ marginTop: 12 }}>
        {uploads.length === 0 ? <div style={{ fontSize: 13, color: "#475569" }}>No documents are outstanding.</div> : uploads.map((slot) => <div key={slot.category} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "8px 0", borderTop: "1px solid #e2e8f0" }}>
          <span style={{ fontSize: 14 }}>{slot.category}{!slot.outstanding && <span style={{ color: "#15803d", marginLeft: 8, fontSize: 12 }}>received</span>}</span>
          <label style={{ ...link, whiteSpace: "nowrap" }}>{uploadingCategory === slot.category ? "Uploading…" : "Choose file"}
            <input type="file" data-testid={`accountant-upload-${slot.category}`} style={{ display: "none" }} disabled={uploadingCategory !== null} onChange={(event) => {
              const file = event.target.files?.[0]; if (file) void handleUpload(slot.category, file); event.currentTarget.value = "";
            }} />
          </label>
        </div>)}
      </div>}
    </div>)}
  </div>;
}

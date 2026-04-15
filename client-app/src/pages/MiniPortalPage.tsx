import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useApplicationStore } from "@/state/useApplicationStore";
import { tokens } from "@/styles";

type Message = {
  id: string;
  role: "client" | "staff";
  content: string;
  staffName?: string;
};

type Offer = {
  id: string;
  lenderName: string;
  lenderLogoUrl?: string;
  amount?: string;
  rateOrFactor?: string;
  term?: string;
  paymentFrequency?: string;
  expiresAt?: string;
  pdfUrl?: string;
};

const STAGES = ["Received!", "In Review", "Documents Required", "Additional Steps Required", "Off to Lender", "Offer"] as const;

const stageLookup: Record<string, number> = {
  received: 0,
  in_review: 1,
  documents_required: 2,
  additional_steps_required: 3,
  off_to_lender: 4,
  offer: 5,
};

const hashtagMap = {
  "#upload": "Upload Documents",
  "#networth": "Personal Net Worth",
  "#equipment": "Equipment Collateral Form",
  "#realestate": "Real Estate Collateral Form",
  "#other": "Other Forms",
} as const;

export default function MiniPortalPage() {
  const { id: routeId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { app, reset } = useApplicationStore();
  const applicationId = routeId || searchParams.get("applicationId") || app.applicationId || app.applicationToken || "";

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [stageIndex, setStageIndex] = useState(0);
  const [offers, setOffers] = useState<Offer[]>([]);

  useEffect(() => {
    if (!applicationId) return;

    let active = true;

    async function loadAll() {
      try {
        const appData = await fetch(`/api/applications/${encodeURIComponent(applicationId)}`).then((r) => r.json());
        if (!active) return;
        const normalized = String(appData?.data?.stage || appData?.stage || "").toLowerCase();
        if (normalized in stageLookup) {
          setStageIndex(stageLookup[normalized as keyof typeof stageLookup]);
        }
      } catch {
        // keep defaults
      }

      try {
        const thread = await fetch(`/api/client/messages?applicationId=${encodeURIComponent(applicationId)}`).then((r) => r.json());
        if (!active) return;
        const incoming = Array.isArray(thread?.data) ? thread.data : Array.isArray(thread) ? thread : [];
        setMessages(
          incoming.map((item: any, idx: number) => ({
            id: String(item.id || idx),
            role: item.role === "staff" ? "staff" : "client",
            content: String(item.content || ""),
            staffName: item.staffName,
          }))
        );
      } catch {
        // noop
      }

      try {
        const offerData = await fetch(`/api/applications/${encodeURIComponent(applicationId)}/offers`).then((r) => r.json());
        if (!active) return;
        const incoming = Array.isArray(offerData?.data) ? offerData.data : Array.isArray(offerData) ? offerData : [];
        setOffers(incoming);
      } catch {
        // noop
      }
    }

    void loadAll();
    const poll = setInterval(() => void loadAll(), 5000);

    return () => {
      active = false;
      clearInterval(poll);
    };
  }, [applicationId]);

  const triggeredActions = useMemo(() => {
    const tags = new Set<string>();
    messages.forEach((message) => {
      if (message.role !== "staff") return;
      Object.keys(hashtagMap).forEach((tag) => {
        if (message.content.toLowerCase().includes(tag)) tags.add(tag);
      });
    });
    return Array.from(tags).map((tag) => hashtagMap[tag as keyof typeof hashtagMap]);
  }, [messages]);

  async function sendMessage() {
    if (!text.trim() || !applicationId) return;
    const next = text.trim();
    setText("");
    await fetch("/api/client/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId, content: next }),
    });
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "client", content: next }]);
  }

  async function uploadDocument(file: File) {
    if (!applicationId) return;
    const form = new FormData();
    form.append("file", file);
    await fetch(`/api/applications/${encodeURIComponent(applicationId)}/documents`, { method: "POST", body: form });
  }

  function startNewApplication() {
    reset();
    navigate("/apply/step-1");
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${STAGES.length}, minmax(0,1fr))`, gap: 10 }}>
          {STAGES.map((stage, index) => (
            <div key={stage} style={{ textAlign: "center" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", border: `2px solid ${index <= stageIndex ? "#2563eb" : "#9ca3af"}`, background: index < stageIndex ? "#2563eb" : "#fff", color: index < stageIndex ? "#fff" : "#2563eb", margin: "0 auto 8px", display: "grid", placeItems: "center", fontSize: 12 }}>{index < stageIndex ? "✓" : index + 1}</div>
              <div style={{ fontSize: 12, color: tokens.colors.textSecondary }}>{stage}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: stageIndex === 5 ? "1fr" : "2fr 1fr", gap: 20 }}>
        <section style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", minHeight: 420, display: "flex", flexDirection: "column" }}>
          <div style={{ padding: 12, borderBottom: "1px solid #e5e7eb", fontWeight: 600 }}>Message Thread</div>
          <div style={{ flex: 1, padding: 12, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.map((message) => (
              <div key={message.id} style={{ display: "flex", justifyContent: message.role === "client" ? "flex-end" : "flex-start", gap: 8 }}>
                {message.role === "staff" && <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#d1d5db", display: "grid", placeItems: "center", fontSize: 12 }}>{(message.staffName || "BF").slice(0, 2).toUpperCase()}</div>}
                <div style={{ background: message.role === "staff" ? "#f3f4f6" : "#fff", border: "1px solid #d1d5db", borderRadius: 12, padding: "8px 12px", maxWidth: "78%" }}>
                  {message.content}
                  {message.role === "staff" && (
                    <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {triggeredActions.map((action) => (
                        <button key={action} style={{ fontSize: 12, padding: "4px 8px", borderRadius: 8, border: "1px solid #93c5fd", background: "#eff6ff" }}>{action}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div style={{ borderTop: "1px solid #e5e7eb", padding: 12, display: "flex", gap: 8 }}>
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message" style={{ flex: 1, border: "1px solid #d1d5db", borderRadius: 8, padding: "8px 12px" }} onKeyDown={(e) => e.key === "Enter" && void sendMessage()} />
            <button onClick={() => void sendMessage()} style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, padding: "8px 12px" }}>Send</button>
          </div>
        </section>

        {stageIndex !== 5 ? (
          <aside style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: 16, display: "flex", flexDirection: "column", gap: 8, alignSelf: "start" }}>
            <button style={{ padding: "10px", borderRadius: 8, border: "1px solid #e5e7eb" }}>Upload Documents</button>
            <input type="file" onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadDocument(file); }} />
            <button onClick={startNewApplication} style={{ padding: "10px", borderRadius: 8, border: "1px solid #e5e7eb" }}>New Application</button>
            {triggeredActions.map((action) => (
              <button key={action} style={{ padding: "10px", borderRadius: 8, border: "1px solid #e5e7eb" }}>{action}</button>
            ))}
            <button style={{ marginTop: 8, padding: "10px", borderRadius: 8, border: "none", background: "#2563eb", color: "#fff", width: "100%" }}>Call Us!</button>
          </aside>
        ) : (
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px,1fr))", gap: 12 }}>
            {offers.map((offer) => (
              <article key={offer.id} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong>{offer.lenderName}</strong>
                  {offer.lenderLogoUrl && <img src={offer.lenderLogoUrl} alt={offer.lenderName} style={{ height: 24 }} />}
                </div>
                <div style={{ fontSize: 14, marginTop: 8 }}>Amount: {offer.amount || "—"}</div>
                <div style={{ fontSize: 14 }}>Rate/Factor: {offer.rateOrFactor || "—"}</div>
                <div style={{ fontSize: 14 }}>Term: {offer.term || "—"}</div>
                <div style={{ fontSize: 14 }}>Payment: {offer.paymentFrequency || "—"}</div>
                <div style={{ fontSize: 14 }}>Expiry: {offer.expiresAt || "—"}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button style={{ flex: 1, border: "1px solid #2563eb", color: "#2563eb", background: "#fff", borderRadius: 8, padding: "8px 10px" }}>View PDF</button>
                  <button style={{ flex: 1, border: "none", background: "#2563eb", color: "#fff", borderRadius: 8, padding: "8px 10px" }}>Request Changes</button>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}

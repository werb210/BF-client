// BF_CLIENT_BLOCK_v300 -- VOIP "Call us" from mini-portal
import { useEffect, useRef, useState } from "react";
import { Device, Call } from "@twilio/voice-sdk";

type State = "idle" | "requesting" | "ringing" | "connected" | "ended" | "failed";

async function fetchClientVoiceToken(): Promise<{ token: string; identity: string } | null> {
  try {
    const r = await fetch("/api/client-voice/token", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
      credentials: "include",
    });
    if (!r.ok) return null;
    const j = await r.json();
    if (!j?.token || !j?.identity) return null;
    return { token: j.token, identity: j.identity };
  } catch { return null; }
}

export default function CallUsButton() {
  const [state, setState] = useState<State>("idle");
  const [err, setErr] = useState<string | null>(null);
  const [durSec, setDurSec] = useState(0);
  const startRef = useRef<number | null>(null);
  const deviceRef = useRef<Device | null>(null);
  const callRef = useRef<Call | null>(null);

  useEffect(() => {
    const i = setInterval(() => {
      if (startRef.current && state === "connected") setDurSec(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(i);
  }, [state]);

  async function placeCall() {
    setErr(null);
    setState("requesting");
    try { const s = await navigator.mediaDevices.getUserMedia({ audio: true }); s.getTracks().forEach(t => t.stop()); }
    catch { setErr("Microphone permission denied"); setState("failed"); return; }
    const tok = await fetchClientVoiceToken();
    if (!tok) { setErr("Could not get voice token"); setState("failed"); return; }
    try {
      const d = new Device(tok.token, { logLevel: 1 } as any);
      d.on("error", (e: any) => { setErr(e?.message ?? "Device error"); setState("failed"); });
      d.on("registered", async () => {
        try {
          const call = await d.connect({ params: { source: "miniportal" } });
          callRef.current = call;
          call.on("ringing", () => setState("ringing"));
          call.on("accept", () => { setState("connected"); startRef.current = Date.now(); });
          call.on("disconnect", () => setState("ended"));
          call.on("error", (e: any) => { setErr(e?.message ?? "Call error"); setState("failed"); });
          setState("ringing");
        } catch (e: any) { setErr(e?.message ?? "Connect failed"); setState("failed"); }
      });
      await d.register();
      deviceRef.current = d;
    } catch (e: any) { setErr(e?.message ?? "Init failed"); setState("failed"); }
  }

  function hangup() {
    callRef.current?.disconnect();
    deviceRef.current?.destroy();
    callRef.current = null;
    deviceRef.current = null;
    setState("idle");
    setDurSec(0);
    startRef.current = null;
  }

  if (state === "idle" || state === "ended" || state === "failed") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button onClick={() => void placeCall()} style={{
          background: "#16a34a", color: "#fff", border: "none", borderRadius: 8,
          padding: "12px 18px", fontSize: 15, fontWeight: 600, cursor: "pointer",
        }}>📞 Call us</button>
        {err && <div style={{ color: "#dc2626", fontSize: 12 }}>{err}</div>}
        {state === "ended" && !err && <div style={{ color: "#6b7280", fontSize: 12 }}>Call ended.</div>}
      </div>
    );
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, background: "#111827", color: "#e5e7eb", borderRadius: 8 }}>
      <div style={{ width: 10, height: 10, borderRadius: 5, background: state === "connected" ? "#16a34a" : "#f59e0b" }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{state === "connected" ? "Connected" : "Connecting…"}</div>
        {state === "connected" && (
          <div style={{ fontSize: 12, color: "#9ca3af" }}>
            {String(Math.floor(durSec/60)).padStart(2,"0")}:{String(durSec%60).padStart(2,"0")}
          </div>
        )}
      </div>
      <button onClick={hangup} style={{ background: "#dc2626", color: "#fff", border: "none", borderRadius: 6, padding: "8px 14px", cursor: "pointer" }}>End</button>
    </div>
  );
}

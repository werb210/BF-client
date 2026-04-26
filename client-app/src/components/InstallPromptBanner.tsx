import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { useState } from "react";

export default function InstallPromptBanner() {
  const { canInstall, promptInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(false);
  if (!canInstall || dismissed) return null;
  return (
    <div role="region" aria-label="Install Boreal app" style={{
      position: "fixed", bottom: 16, left: 16, right: 16, zIndex: 50,
      background: "#020C1C", color: "white", padding: "12px 16px",
      borderRadius: 12, display: "flex", gap: 12, alignItems: "center",
      boxShadow: "0 8px 24px rgba(0,0,0,0.25)", maxWidth: 480, margin: "0 auto"
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600 }}>Install Boreal</div>
        <div style={{ fontSize: 13, opacity: 0.85 }}>Faster access and offline support</div>
      </div>
      <button onClick={() => setDismissed(true)} style={{ background: "transparent", color: "white", border: "1px solid rgba(255,255,255,0.4)", padding: "6px 10px", borderRadius: 8 }}>Not now</button>
      <button onClick={() => promptInstall()} style={{ background: "#F5C443", color: "#020C1C", border: 0, padding: "6px 12px", borderRadius: 8, fontWeight: 600 }}>Install</button>
    </div>
  );
}

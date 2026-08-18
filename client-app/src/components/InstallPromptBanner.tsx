import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { useState } from "react";
import { tokens } from "@/styles";

// BF_CLIENT_INSTALL_v177 - the wizard has a sticky action bar at the bottom of
// every step. This clears it rather than covering it: an install prompt must
// never sit over the button that advances an application.
const STICKY_FOOTER_CLEARANCE = 88;

export default function InstallPromptBanner() {
  const { canInstall, promptInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(false);
  if (!canInstall || dismissed) return null;
  return (
    <div
      role="region"
      aria-label="Install Boreal app"
      style={{
        position: "fixed",
        bottom: STICKY_FOOTER_CLEARANCE,
        left: 16,
        right: 16,
        zIndex: 50,
        background: tokens.colors.primary,
        color: "white",
        padding: "12px 16px",
        borderRadius: tokens.radii.md,
        display: "flex",
        gap: 12,
        alignItems: "center",
        boxShadow: "0 8px 24px rgba(11, 31, 58, 0.3)",
        maxWidth: 480,
        margin: "0 auto",
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600 }}>Install Boreal</div>
        <div style={{ fontSize: 13, opacity: 0.85 }}>Faster access and offline support</div>
      </div>
      <button
        onClick={() => setDismissed(true)}
        style={{
          background: "transparent",
          color: "white",
          border: "1px solid rgba(255,255,255,0.4)",
          padding: "8px 12px",
          borderRadius: 8,
          minHeight: 40,
          cursor: "pointer",
        }}
      >
        Not now
      </button>
      <button
        onClick={() => promptInstall()}
        style={{
          background: tokens.colors.accent,
          color: tokens.colors.primary,
          border: 0,
          padding: "8px 14px",
          borderRadius: 8,
          minHeight: 40,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Install
      </button>
    </div>
  );
}

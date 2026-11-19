import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { useState } from "react";
import { useLocation } from "react-router-dom";
import { tokens } from "@/styles";

// BF_CLIENT_INSTALL_v177 - the wizard has a sticky action bar at the bottom of
// every step. This clears it rather than covering it: an install prompt must
// never sit over the button that advances an application.
const STICKY_FOOTER_CLEARANCE = 88;

const DISMISS_KEY = "install-banner-dismissed-until";
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000;
/** The landing page is the sign-in screen; /otp and /login lead to it. */
export function isSignInPath(pathname: string): boolean {
  return pathname === "/" || /^\/(otp|login|sign-in|signin)(\/|$)/i.test(pathname);
}

export default function InstallPromptBanner() {
  const { canInstall, promptInstall } = useInstallPrompt();
  // BF_CLIENT_INSTALL_NOT_ON_SIGN_IN_v1 - the banner sat over the sign-in form. It is never shown on the sign-in pages,
  // and "Not now" is remembered on this device for a week (it came back on every page load).
  const { pathname } = useLocation();
  const [dismissed, setDismissed] = useState(() => {
    try { return Number(localStorage.getItem(DISMISS_KEY) ?? 0) > Date.now(); } catch { return false; }
  });
  if (!canInstall || dismissed || isSignInPath(pathname)) return null;
  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_MS)); } catch { /* private mode */ }
  };
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
        <div style={{ fontSize: "var(--bf-text-label)", opacity: 0.85 }}>Faster access and offline support</div>
      </div>
      <button
        onClick={dismiss}
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

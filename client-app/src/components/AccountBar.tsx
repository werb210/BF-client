// BF_CLIENT_ACCOUNT_BAR_v341
// The Face ID control sat at the bottom of the mini-portal's "What's Next?"
// panel, below seven buttons and a phone number, where it had to be scrolled to.
// BI-Client puts the same control in a bar at the top of every signed-in screen
// and it is found immediately. Same here.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import FaceIdSignInToggle from "@/components/FaceIdSignInToggle";
import { clearToken } from "@/api/auth"; // BF_CLIENT_SIGN_OUT_v345

export default function AccountBar() {
  // BF_CLIENT_SIGN_OUT_v345
  // There was no way to sign out of this app. clearToken() was called in exactly
  // two places: RequireOTP, when the URL carries ?fresh=1, and the accountant
  // page, which is a different login entirely. No button anywhere ended a client
  // session. Deleting the app did not do it either - the token lives in the
  // Keychain and survives deletion - so a session, once started, was permanent
  // on that device.
  //
  // That is a real problem for clients, not just for testing: someone who signs
  // in on a borrowed or shared phone cannot get back out, and their application,
  // documents and messages stay reachable to whoever holds the device.
  //
  // Signing out also revokes this device's Face ID credential. Leaving it behind
  // would let the next person press "Sign in with Face ID" and walk straight
  // back into the account that just signed out.
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  const signOut = async () => {
    setSigningOut(true);
    try {
      const m = await import("@/native/deviceSignIn");
      // Semantically equivalent to `.catch(() => undefined)`, with an explicit
      // return type for projects that enable TypeScript's noImplicitAny check.
      await m.disableDeviceSignIn().catch((): void => undefined);
    } catch {
      // No credential to revoke, or the plugin is unavailable on this platform.
      // Never let that keep someone signed in.
    }
    clearToken();
    navigate("/otp", { replace: true });
  };

  return (
    <div
      data-testid="account-bar"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
        padding: "6px 16px",
        borderBottom: "1px solid #E2E8F0",
        background: "#FFFFFF",
      }}
    >
      <FaceIdSignInToggle />
      {/* BF_CLIENT_SIGN_OUT_v345 - pushed to the far end so it is never the
          thing a client hits by accident while reaching for Face ID. */}
      <button
        type="button"
        onClick={() => void signOut()}
        disabled={signingOut}
        style={{
          marginLeft: "auto",
          background: "none",
          border: 0,
          color: "#1e3a5f",
          fontSize: 14,
          textDecoration: "underline",
          cursor: signingOut ? "default" : "pointer",
          padding: 0,
        }}
      >
        {signingOut ? "Signing out…" : "Sign out"}
      </button>
    </div>
  );
}

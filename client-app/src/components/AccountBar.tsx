// BF_CLIENT_ACCOUNT_BAR_v341
// The Face ID control sat at the bottom of the mini-portal's "What's Next?"
// panel, below seven buttons and a phone number, where it had to be scrolled to.
// BI-Client puts the same control in a bar at the top of every signed-in screen
// and it is found immediately. Same here.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import FaceIdSignInToggle from "@/components/FaceIdSignInToggle";
import PasskeySignInToggle from "@/components/PasskeySignInToggle"; // BF_CLIENT_BLOCK_v600
import { wipeSession } from "@/auth/logout"; // BF_CLIENT_v789_SIGN_OUT_WIPE
import { useIsPhoneWidth } from "@/components/CmpPhone"; // BF_CLIENT_v802_ACCOUNT_BUTTON
import { Sheet } from "@/components/cmp/CmpHome";
import { Icon } from "@/components/cmp/icons";

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
  //
  // BF_CLIENT_v789_SIGN_OUT_WIPE - and it removes everything else the session
  // left on the device: application token, saved profiles, drafts, the outbox,
  // the service worker caches and the push registration (auth/logout.ts).
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  // BF_CLIENT_v802_ACCOUNT_BUTTON - on a phone the Face ID / Sign out row no longer sits on top of every
  // screen: a small account button opens them in a sheet.
  const isPhone = useIsPhoneWidth();
  const [sheetOpen, setSheetOpen] = useState(false);

  const signOut = async () => {
    setSigningOut(true);
    try {
      await wipeSession();
    } catch {
      // A failed cache or push step must never keep someone signed in; the
      // tokens and storage are cleared synchronously before anything awaits.
    }
    navigate("/otp", { replace: true }); // BF_CLIENT_v790 - same destination as before v789
  };

  if (isPhone) {
    return (
      <>
        <button type="button" className="cmpx-acct-btn" aria-label="Account" data-testid="account-button" onClick={() => setSheetOpen(true)}>
          <Icon name="user" size={20} />
        </button>
        {sheetOpen ? (
          <Sheet title="Account" onClose={() => setSheetOpen(false)} testId="account-sheet">
            <div className="cmpx-list cmpx-settings__toggles" style={{ marginBottom: 12 }}>
              <FaceIdSignInToggle />
              <PasskeySignInToggle />
            </div>
            <button type="button" className="cmpx-btn cmpx-btn--ghost cmpx-btn--block" disabled={signingOut} onClick={() => void signOut()}>
              <Icon name="out" />{signingOut ? "Signing out..." : "Sign out"}
            </button>
          </Sheet>
        ) : null}
      </>
    );
  }

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
      <PasskeySignInToggle />
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

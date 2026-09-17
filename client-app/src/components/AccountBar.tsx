// BF_CLIENT_ACCOUNT_BAR_v341
// The Face ID control sat at the bottom of the mini-portal's "What's Next?"
// panel, below seven buttons and a phone number, where it had to be scrolled to.
// BI-Client puts the same control in a bar at the top of every signed-in screen
// and it is found immediately. Same here.
import FaceIdSignInToggle from "@/components/FaceIdSignInToggle";

export default function AccountBar() {
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
    </div>
  );
}

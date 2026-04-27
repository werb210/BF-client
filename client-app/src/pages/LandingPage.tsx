import { Navigate } from "react-router-dom";

export default function LandingPage() {
  // BF_LANDING_OTP_REDIRECT_v23 — Block 23
  return <Navigate to="/otp" replace />;
}

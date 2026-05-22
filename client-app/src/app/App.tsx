import AppRoutes from "./AppRoutes";
// BF_CLIENT_BLOCK_v96_LIVE_TEST_FIXES_v1 — banner now lives only in
// WizardLayout. App-level mount removed to prevent doubling.
// import { OfflineBanner } from "../components/OfflineBanner";
import { SessionRefreshOverlay } from "../components/SessionRefreshOverlay";
import ErrorBoundary from "./ErrorBoundary";
import FatalErrorScreen from "./FatalErrorScreen";
// BF_CLIENT_BLOCK_v318_MAYA_RIP_AND_REPLACE_v1
import MayaWidget from "../components/MayaWidget";
import InstallPromptBanner from "@/components/InstallPromptBanner";
import UpdatePromptBanner from "@/components/UpdatePromptBanner";
import RetryBanner from "../components/RetryBanner";

export default function App() {
  return (
    <ErrorBoundary fallback={<FatalErrorScreen />}>
      <RetryBanner />
      <UpdatePromptBanner />
      <InstallPromptBanner />
      {/* BF_CLIENT_BLOCK_v96_LIVE_TEST_FIXES_v1 — see import comment */}
      <SessionRefreshOverlay />
      <AppRoutes />
      <MayaWidget />
    </ErrorBoundary>
  );
}

import AppRoutes from "./AppRoutes";
// BF_CLIENT_BLOCK_v96_LIVE_TEST_FIXES_v1 — banner now lives only in
// WizardLayout. App-level mount removed to prevent doubling.
// import { OfflineBanner } from "../components/OfflineBanner";
import { SessionRefreshOverlay } from "../components/SessionRefreshOverlay";
import ErrorBoundary from "./ErrorBoundary";
import FatalErrorScreen from "./FatalErrorScreen";
import MayaFloatingButton from "../components/MayaFloatingButton";
import InstallPromptBanner from "@/components/InstallPromptBanner";
import UpdatePromptBanner from "@/components/UpdatePromptBanner";

export default function App() {
  return (
    <ErrorBoundary fallback={<FatalErrorScreen />}>
      <UpdatePromptBanner />
      <InstallPromptBanner />
      {/* BF_CLIENT_BLOCK_v96_LIVE_TEST_FIXES_v1 — see import comment */}
      <SessionRefreshOverlay />
      <AppRoutes />
      <MayaFloatingButton />
    </ErrorBoundary>
  );
}

import AppRoutes from "./AppRoutes";
import { OfflineBanner } from "../components/OfflineBanner";
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
      <OfflineBanner />
      <SessionRefreshOverlay />
      <AppRoutes />
      <MayaFloatingButton />
    </ErrorBoundary>
  );
}

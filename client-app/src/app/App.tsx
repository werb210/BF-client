import AppRoutes from "./AppRoutes";
import { OfflineBanner } from "../components/OfflineBanner";
import { UpdateAvailableBanner } from "../components/UpdateAvailableBanner";
import { SessionRefreshOverlay } from "../components/SessionRefreshOverlay";
import { useServiceWorkerUpdate } from "../hooks/useServiceWorkerUpdate";
import { applyServiceWorkerUpdate } from "../pwa/serviceWorker";
import ErrorBoundary from "./ErrorBoundary";
import FatalErrorScreen from "./FatalErrorScreen";
import MayaFloatingButton from "../components/MayaFloatingButton";

export default function App() {
  const updateAvailable = useServiceWorkerUpdate();

  return (
    <ErrorBoundary fallback={<FatalErrorScreen />}>
      <OfflineBanner />
      <SessionRefreshOverlay />
      <UpdateAvailableBanner
        updateAvailable={updateAvailable}
        onApplyUpdate={() => void applyServiceWorkerUpdate()}
      />
      <AppRoutes />
      <MayaFloatingButton />
    </ErrorBoundary>
  );
}
